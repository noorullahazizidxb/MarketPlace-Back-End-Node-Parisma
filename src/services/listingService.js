import { listingRepository } from '../repositories/listingRepository.js';
import { queues, QUEUES } from '../jobs/queues.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { cachedResponse, redisSet, redisDel } from '../utils/redisCache.js';

export const listingService = {
  async createListing(payload, userId) {
    // use client-provided expiresAt if valid, otherwise default to configured expiry
    let expiresAt;
    if (payload.expiresAt) {
      try { expiresAt = new Date(payload.expiresAt); if (isNaN(expiresAt)) expiresAt = null; } catch (e) { expiresAt = null; }
    }
    if (!expiresAt) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.retention.listingDefaultExpiryDays);
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
    // enforce contact visibility: return platform contact placeholders if hidden
    if (listing.contactVisibility === 'HIDE_SELLER') {
      // remove sensitive user contact fields
      const safeUser = { id: listing.user.id, name: listing.user.email ? listing.user.email : null };
      listing.user = safeUser;
    }
  return listing;
  },

  async approveListing(listingId, adminId, opts = {}) {
    const approvedAt = new Date();
    const data = {
      status: 'APPROVED',
      approvedAt,
      approvedById: adminId,
      contactVisibility: opts.contactVisibility || 'HIDE_SELLER'
    };

  const listing = await listingRepository.update(listingId, data);

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

  // reload with relations
  const full = await listingRepository.getById(listing.id);
  // invalidate cache
  try { await redisDel(`listing:${full.id}`); } catch (e) {}
  logger.info({ listingId, adminId }, 'Listing approved');
  return full;
  }
};
