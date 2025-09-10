import { listingRepository } from '../repositories/listingRepository.js';
import { queues } from '../jobs/queues.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const listingService = {
  async createListing(payload, userId) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.retention.listingDefaultExpiryDays);

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
      expiresAt: expiresAt
    };

    const listing = await listingRepository.create(data);

    // images: if provided as array of urls, create ListingImage entries
    if (payload.images && payload.images.length) {
      const imgs = payload.images.map((url, idx) => ({ listingId: listing.id, url, position: idx }));
      await prisma.listingImage.createMany({ data: imgs });
    }

    // enqueue a search-index job (will index only after approved; worker will check status)
    await queues.SEARCH_INDEX.add('index-listing', { listingId: listing.id });

    logger.info({ listingId: listing.id }, 'Created listing (pending approval)');
    return listing;
  },

  async getListing(id) {
    const listing = await listingRepository.getById(id);
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
    await queues.SEARCH_INDEX.add('index-listing', { listingId: listing.id, force: true });

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

    logger.info({ listingId, adminId }, 'Listing approved');
    return listing;
  }
};
