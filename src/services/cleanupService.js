import { prisma } from '../config/prisma.js';
import { storage } from '../utils/storage.js';
import { logger } from '../utils/logger.js';

export const cleanupService = {
  /** Create audit log + owner notification, then delete files and the listing row. */
  async deleteListingWithAudit(listing, action = 'AUTO_DELETE', triggerEvent = 'AUTO_DELETE') {
    try {
      await prisma.auditLog.create({
        data: { listingId: listing.id, action, details: { status: listing.status, reason: 'retention' } }
      });
    } catch (e) {
      logger.warn({ listingId: listing.id, err: e?.message }, 'Failed to create audit log before deletion');
    }

    await this.notifyListingDeletion(listing, triggerEvent);
    await this.deleteListingFiles(listing.id);

    try {
      await prisma.listing.delete({ where: { id: listing.id } });
    } catch (e) {
      logger.warn({ listingId: listing.id, err: e?.message }, 'Failed to delete listing (may already be removed)');
    }

    logger.info({ listingId: listing.id, action }, 'Listing deleted via cleanup');
  },

  async notifyListingDeletion(listing, triggerEvent) {
    try {
      await prisma.notification.create({
        data: {
          title: 'Listing removed',
          message: `Your listing "${listing.title}" was removed during cleanup (status: ${listing.status}).`,
          channel: 'SYSTEM',
          targetType: 'USER',
          listingId: listing.id,
          triggerEvent,
          recipients: { create: [{ userId: listing.userId }] }
        }
      });
      try {
        const { emitToUser } = await import('../websocket/socket.js');
        emitToUser(listing.userId, 'notification:new', { type: triggerEvent, listingId: listing.id });
      } catch (e) { /* socket optional */ }
    } catch (e) {
      logger.warn({ listingId: listing.id, err: e?.message }, 'Failed to create deletion notification');
    }
  },

  async deleteListingFiles(listingId) {
    try {
      await storage.deleteDirectory(`uploads/listings/${listingId}`);
    } catch (e) { /* filesystem failure is non-fatal */ }
  },

  /** Delete all non-APPROVED listings created before cutoffDate. */
  async purgeUnapprovedOlderThan(cutoffDate) {
    const toDelete = await prisma.listing.findMany({
      where: { status: { not: 'APPROVED' }, createdAt: { lt: cutoffDate } }
    });

    for (const listing of toDelete) {
      await this.deleteListingWithAudit(listing, 'AUTO_DELETE_UNAPPROVED', 'AUTO_DELETE_UNAPPROVED');
    }

    return toDelete.length;
  },

  /** Delete listings that are in non-pending/non-approved statuses (stale states). */
  async purgeStaleListing() {
    const toDelete = await prisma.listing.findMany({
      where: { status: { notIn: ['PENDING', 'APPROVED'] } }
    });

    for (const listing of toDelete) {
      await this.deleteListingWithAudit(listing, 'AUTO_DAILY_PURGE', 'AUTO_DAILY_PURGE');
    }

    return toDelete.length;
  }
};
