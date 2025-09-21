import { listingRepository } from '../repositories/listingRepository.js';
import { renewRepository } from '../repositories/renewRepository.js';
import { queues, QUEUES } from '../jobs/queues.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { cachedResponse, redisSet, redisDel } from '../utils/redisCache.js';

export const listingService = {
  async createListing(payload, userId) {
    // use client-provided expiresAt if valid; no default expiry applied
    let expiresAt;
    if (payload.expiresAt) {
      try { expiresAt = new Date(payload.expiresAt); if (isNaN(expiresAt)) expiresAt = null; } catch (e) { expiresAt = null; }
    }

    const data = {
      title: payload.title,
      description: payload.description,
      price: payload.price,
      currency: payload.currency || 'AFN',
      listingType: payload.listingType,
      status: 'PENDING',
      contactVisibility: payload.contactVisibility || 'HIDE_SELLER',
      user: { connect: { id: userId } },
      category: { connect: { id: payload.categoryId } },
  location: payload.location || null,
  address: payload.address || null,
  metadata: payload.metadata !== undefined ? payload.metadata : undefined,
  expiresAt: expiresAt
    };

    const listing = await listingRepository.create(data);

    // Notify the owner that the listing is pending approval
    try {
      await prisma.notification.create({
        data: {
          title: 'Listing submitted - pending approval',
          message: `Your listing "${listing.title}" has been submitted and is pending admin approval. It will not be visible until approved. Please wait for confirmation.`,
          channel: 'SYSTEM',
          targetType: 'USER',
          listingId: listing.id,
          recipients: { create: [{ userId }] }
        }
      });
    } catch (e) {
      logger.warn(e, 'Failed to create pending approval notification for listing');
    }

    // images: if provided as array (either urls or objects with url/alt/position), create ListingImage entries
    if (payload.images && payload.images.length) {
      const imgs = payload.images.map((item, idx) => {
        if (typeof item === 'string') return { listingId: listing.id, url: item, position: idx };
        return { listingId: listing.id, url: item.url, alt: item.alt || null, position: item.position !== undefined ? item.position : idx };
      });
      await prisma.listingImage.createMany({ data: imgs });
    }

    // enqueue a search-index job (will index only after approved; worker will check status)
    try {
      const q = queues && QUEUES && queues[QUEUES.SEARCH_INDEX];
      if (typeof q?.add === 'function') {
        await q.add('index-listing', { listingId: listing.id });
      } else {
        logger.warn({ listingId: listing.id }, 'Search index queue not available; skipping enqueue');
      }
    } catch (e) {
      logger.error(e, 'Failed to enqueue search index job');
    }

  // reload with relations for response
  const full = await listingRepository.getById(listing.id);
  // cache listing detail
  try { await redisSet(`listing:${full.id}`, full, 60); } catch (e) {}
  logger.info({ listingId: listing.id }, 'Created listing (pending approval)');
  return full;
  },

  async getListing(id) {
  const key = `listing:${id}`;
  const listing = await cachedResponse(key, async () => await listingRepository.getById(id), 60);
  if (!listing) return null;
    // attach feedback stats
    if (Array.isArray(listing.feedbacks) && listing.feedbacks.length) {
      const ratings = listing.feedbacks.map(f => typeof f.rating === 'number' ? f.rating : null).filter(v => v !== null);
      const count = ratings.length;
      const avg = count ? (ratings.reduce((a,b)=>a+b,0) / count) : 0;
      listing.reviewCount = listing.feedbacks.length;
      listing.averageRating = avg;
    } else {
      listing.reviewCount = 0;
      listing.averageRating = 0;
    }
    // Return full user info regardless of contactVisibility (per requirement)
  return listing;
  },

  async approveListing(listingId, adminId, opts = {}) {
    const approvedAt = new Date();
    // Set initial listing expiry window from approval time
    const expiresAt = new Date();
    try {
      expiresAt.setDate(expiresAt.getDate() + (config.retention.renewWindowDays || 0));
    } catch (e) {}
    const data = {
      status: 'APPROVED',
      approvedAt,
      approvedById: adminId,
      contactVisibility: opts.contactVisibility || 'HIDE_SELLER',
      expiresAt
    };

  const listing = await listingRepository.update(listingId, data);

    // If seller is hidden, bind representatives whose region matches listing location
    try {
      const visibility = data.contactVisibility;
      const region = (listing.location || '').trim();
      if (visibility === 'HIDE_SELLER' && region) {
        const reps = await prisma.representativeInfo.findMany({ where: { active: true, region } });
        if (reps && reps.length) {
          const rows = reps.map(r => ({ listingId: listing.id, representativeId: r.id }));
          await prisma.listingRepresentative.createMany({ data: rows, skipDuplicates: true });
        }
      }
    } catch (e) {
      logger.warn(e, 'Failed to bind representatives during approval');
    }

    // push an index job to ensure ES is updated
    try {
      const q2 = queues && QUEUES && queues[QUEUES.SEARCH_INDEX];
      if (typeof q2?.add === 'function') {
        await q2.add('index-listing', { listingId: listing.id, force: true });
      } else {
        logger.warn({ listingId: listing.id }, 'Search index queue not available; skipping enqueue');
      }
    } catch (e) {
      logger.error(e, 'Failed to enqueue search index job on approve');
    }

    // Create a notification record for the owner (lightweight)
    await prisma.notification.create({
      data: {
        title: 'Your listing was approved',
        message: `Your listing \"${listing.title}\" has been approved by admin.`,
        channel: 'SYSTEM',
        targetType: 'USER',
        senderId: adminId,
        listingId: listing.id,
        recipients: { create: [{ userId: listing.userId }] }
      }
    });

    // Issue renew token valid for RENEW_WINDOW_DAYS
    try {
      const { renewService } = await import('../services/renewService.js');
      await renewService.issueToken(listing.id);
    } catch (e) {
      // Log full error for debugging
      logger.warn({ err: e && e.stack ? e.stack : e }, 'Failed to issue renew token on approval - attempting fallback');
      try {
        // Ensure listing.expiresAt is set (use computed expiresAt above)
        if (!listing.expiresAt) {
          const expiresAtFallback = new Date();
          expiresAtFallback.setDate(expiresAtFallback.getDate() + (config.retention.renewWindowDays || 0));
          await prisma.listing.update({ where: { id: listing.id }, data: { expiresAt: expiresAtFallback } });
        }
        // Create token directly if missing
        const existingToken = await prisma.listingRenewToken.findUnique({ where: { listingId: listing.id } });
        if (!existingToken) {
          await renewRepository.createToken(listing.id, listing.expiresAt || new Date());
          logger.info({ listingId: listing.id }, 'Fallback: created renew token directly after failed issue');
        }
      } catch (fallbackErr) {
        logger.error({ err: fallbackErr && fallbackErr.stack ? fallbackErr.stack : fallbackErr }, 'Fallback token creation failed');
      }
    }

  // reload with relations
  const full = await listingRepository.getById(listing.id);
  // invalidate cache
  try { await redisDel(`listing:${full.id}`); } catch (e) {}
  logger.info({ listingId, adminId }, 'Listing approved');
  return full;
  }
  ,
  async rejectListing(listingId, adminId, opts = {}) {
    const data = {
      status: 'REJECTED',
      approvedById: adminId,
    };
    const listing = await listingRepository.update(listingId, data);

    // Create a notification to the owner about rejection
    try {
      await prisma.notification.create({
        data: {
          title: 'Your listing was rejected',
          message: `Your listing \"${listing.title}\" has been rejected by admin.`,
          channel: 'SYSTEM',
          targetType: 'USER',
          senderId: adminId,
          listingId: listing.id,
          recipients: { create: [{ userId: listing.userId }] }
        }
      });
    } catch (e) {
      logger.warn(e, 'Failed to create rejection notification');
    }

    // invalidate cache
    try { await redisDel(`listing:${listing.id}`); } catch (e) {}
    logger.info({ listingId, adminId }, 'Listing rejected');
    return listing;
  }
};
