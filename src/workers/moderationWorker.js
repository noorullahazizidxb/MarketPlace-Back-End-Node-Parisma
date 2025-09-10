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
  const toDelete = await prisma.listing.findMany({ where: { status: 'PENDING', createdAt: { lt: cutoffDate } } });
  for (const l of toDelete) {
    // delete files
    try {
      const { storage } = await import('../utils/storage.js');
      storage.deleteDirectory(`uploads/listings/${l.id}`);
    } catch (e) {}
    await prisma.listing.delete({ where: { id: l.id } });
    await prisma.auditLog.create({ data: { listingId: l.id, action: 'AUTO_DELETE_UNAPPROVED', details: { reason: 'retention' } } });
    logger.info({ listingId: l.id }, 'Auto-deleted unapproved listing');
  }
}, { connection });

new QueueEvents('moderation-cleanup', { connection }).on('failed', (e) => logger.error({ e }, 'Moderation worker failed'));
