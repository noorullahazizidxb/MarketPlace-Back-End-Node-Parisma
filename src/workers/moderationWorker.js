import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Worker, QueueEvents } = require('bullmq');
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { cleanupService } from '../services/cleanupService.js';

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });

export const moderationWorker = new Worker('moderation-cleanup', async (job) => {
  const { cutoff } = job.data;
  const cutoffDate = new Date(cutoff);

  const unapprovedCount = await cleanupService.purgeUnapprovedOlderThan(cutoffDate);
  logger.info({ count: unapprovedCount }, 'Purged unapproved listings');

  const staleCount = await cleanupService.purgeStaleListing();
  logger.info({ count: staleCount }, 'Purged stale listings (daily)');
}, { connection });

new QueueEvents('moderation-cleanup', { connection }).on('failed', (e) => logger.error({ e }, 'Moderation worker failed'));
