import pkg from 'bullmq';
const { Worker, QueueEvents } = pkg;
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(config.redisUrl);

export const statusCleanupWorker = new Worker('status-cleanup', async (job) => {
  // delete SOLD/RENTED older than SOLD_RENTED_CLEANUP_DAYS
  const soldCutoff = new Date();
  soldCutoff.setDate(soldCutoff.getDate() - config.retention.soldRentedCleanupDays);
  const sold = await prisma.listing.findMany({ where: { status: { in: ['SOLD', 'RENTED'] }, updatedAt: { lt: soldCutoff } } });
  for (const l of sold) {
  try { const { storage } = await import('../utils/storage.js'); storage.deleteDirectory(`uploads/listings/${l.id}`); } catch (e) {}
  await prisma.listing.delete({ where: { id: l.id } });
  await prisma.auditLog.create({ data: { listingId: l.id, action: 'AUTO_DELETE_SOLD_RENTED', details: { reason: 'retention' } } });
  logger.info({ listingId: l.id }, 'Auto-deleted sold/rented listing');
  }

  // delete DRAFT older than draft cleanup
  const draftCutoff = new Date();
  draftCutoff.setDate(draftCutoff.getDate() - config.retention.draftCleanupDays);
  const drafts = await prisma.listing.findMany({ where: { status: 'DRAFT', updatedAt: { lt: draftCutoff } } });
  for (const d of drafts) {
  try { const { storage } = await import('../utils/storage.js'); storage.deleteDirectory(`uploads/listings/${d.id}`); } catch (e) {}
  await prisma.listing.delete({ where: { id: d.id } });
  await prisma.auditLog.create({ data: { listingId: d.id, action: 'AUTO_DELETE_DRAFT', details: { reason: 'retention' } } });
  logger.info({ listingId: d.id }, 'Auto-deleted stale draft');
  }

  // delete EXPIRED older than soldRentedCleanupDays (reuse retention setting)
  const expiredCutoff = new Date();
  expiredCutoff.setDate(expiredCutoff.getDate() - config.retention.soldRentedCleanupDays);
  const expired = await prisma.listing.findMany({ where: { status: 'EXPIRED', updatedAt: { lt: expiredCutoff } } });
  for (const e of expired) {
  try { const { storage } = await import('../utils/storage.js'); storage.deleteDirectory(`uploads/listings/${e.id}`); } catch (e) {}
  await prisma.listing.delete({ where: { id: e.id } });
  await prisma.auditLog.create({ data: { listingId: e.id, action: 'AUTO_DELETE_EXPIRED', details: { reason: 'retention' } } });
  logger.info({ listingId: e.id }, 'Auto-deleted expired listing');
  }
}, { connection });

new QueueEvents('status-cleanup', { connection }).on('failed', (e) => logger.error({ e }, 'Status cleanup failed'));
