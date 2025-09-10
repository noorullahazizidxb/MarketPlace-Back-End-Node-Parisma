import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Worker, QueueEvents } = require('bullmq');
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });

export const feedbackWorker = new Worker('feedback-reminder', async (job) => {
  // Remind owners to give feedback for SOLD/RENTED items that were recently marked
  const reminderCutoff = new Date();
  reminderCutoff.setDate(reminderCutoff.getDate() - config.retention.feedbackReminderDays);

  const listings = await prisma.listing.findMany({ where: { status: { in: ['SOLD', 'RENTED'] }, soldOrRentedAt: { lt: reminderCutoff } } });
  for (const l of listings) {
    // Create notification to owner
    await prisma.notification.create({
      data: {
        title: 'Please provide feedback',
        message: `Please provide feedback for your listing ${l.title}`,
        channel: 'SYSTEM',
        targetType: 'USER',
        listingId: l.id,
        recipients: { create: [{ userId: l.userId }] }
      }
    });
    logger.info({ listingId: l.id }, 'Created feedback reminder notification');
  }
}, { connection });

new QueueEvents('feedback-reminder', { connection }).on('failed', (e) => logger.error({ e }, 'Feedback worker failed'));
