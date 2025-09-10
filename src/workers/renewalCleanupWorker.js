import pkg from 'bullmq';
const { Worker, QueueEvents } = pkg;
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(config.redisUrl);

export const renewalCleanupWorker = new Worker('renewal-cleanup', async (job) => {
  // Find expired listings (expiresAt < now) and not renewed -> set status EXPIRED and schedule deletion per retention
  const now = new Date();
  const expired = await prisma.listing.findMany({ where: { expiresAt: { lt: now }, status: { not: 'EXPIRED' } } });
  for (const l of expired) {
    await prisma.listing.update({ where: { id: l.id }, data: { status: 'EXPIRED' } });
    await prisma.auditLog.create({ data: { listingId: l.id, action: 'MARK_EXPIRED', details: {} } });
    logger.info({ listingId: l.id }, 'Marked listing as EXPIRED');
  }
}, { connection });

new QueueEvents('renewal-cleanup', { connection }).on('failed', (e) => logger.error({ e }, 'Renewal cleanup failed'));
