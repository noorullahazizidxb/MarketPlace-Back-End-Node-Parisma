import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Worker, QueueEvents } = require('bullmq');
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });

export const moderationWorker = new Worker('moderation-cleanup', async (job) => {
  const { cutoff } = job.data; // ISO string or Date
  const cutoffDate = new Date(cutoff);
  // Remove all listings except APPROVED created before cutoff
  const toDelete = await prisma.listing.findMany({ where: { status: { not: 'APPROVED' }, createdAt: { lt: cutoffDate } } });
  for (const l of toDelete) {
    // Create audit log & notification BEFORE deletion to avoid FK issues
    try {
      await prisma.auditLog.create({ data: { listingId: l.id, action: 'AUTO_DELETE_UNAPPROVED', details: { reason: 'retention' } } });
    } catch (e) {
      logger.warn({ listingId: l.id, err: e?.message }, 'Failed to create audit log before deletion');
    }
    let notified = false;
    try {
      await prisma.notification.create({
        data: {
          title: 'Listing removed (unapproved)',
          message: `Your listing "${l.title}" was removed because it remained unapproved past the retention window.`,
          channel: 'SYSTEM',
          targetType: 'USER',
          listingId: l.id,
          triggerEvent: 'AUTO_DELETE_UNAPPROVED',
          recipients: { create: [{ userId: l.userId }] }
        }
      });
      notified = true;
      try { const { emitToUser } = await import('../websocket/socket.js'); emitToUser(l.userId, 'notification:new', { type: 'AUTO_DELETE_UNAPPROVED', listingId: l.id }); } catch (e) {}
    } catch (e) {
      logger.warn({ listingId: l.id, err: e?.message }, 'Failed to create deletion notification');
    }
    // delete files then listing
    try {
      const { storage } = await import('../utils/storage.js');
      storage.deleteDirectory(`uploads/listings/${l.id}`);
    } catch (e) {}
    try {
      await prisma.listing.delete({ where: { id: l.id } });
    } catch (e) {
      logger.warn({ listingId: l.id, err: e?.message }, 'Failed to delete listing (may have been removed already)');
    }
    logger.info({ listingId: l.id, notified }, 'Auto-deleted unapproved listing');
  }
  // Additional daily purge: remove listings whose status is neither PENDING nor APPROVED (stale non-approved states)
  try {
    const purge = await prisma.listing.findMany({ where: { status: { notIn: ['PENDING', 'APPROVED'] } } });
    for (const l of purge) {
      try { await prisma.auditLog.create({ data: { listingId: l.id, action: 'AUTO_DAILY_PURGE', details: { status: l.status } } }); } catch (e) {}
      try {
        await prisma.notification.create({
          data: {
            title: 'Listing removed',
            message: `Your listing "${l.title}" was removed during daily cleanup (status: ${l.status}).`,
            channel: 'SYSTEM',
            targetType: 'USER',
            listingId: l.id,
            triggerEvent: 'AUTO_DAILY_PURGE',
            recipients: { create: [{ userId: l.userId }] }
          }
        });
      } catch (e) {}
      try { const { storage } = await import('../utils/storage.js'); storage.deleteDirectory(`uploads/listings/${l.id}`); } catch (e) {}
      try { await prisma.listing.delete({ where: { id: l.id } }); } catch (e) {}
      logger.info({ listingId: l.id, status: l.status }, 'Daily purge removed listing');
    }
  } catch (e) {
    logger.warn({ err: e?.message }, 'Daily purge failed');
  }
}, { connection });

new QueueEvents('moderation-cleanup', { connection }).on('failed', (e) => logger.error({ e }, 'Moderation worker failed'));
