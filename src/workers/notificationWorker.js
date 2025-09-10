import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Worker, QueueEvents } = require('bullmq');
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { sendWhatsApp } from '../notifications/whatsappAdapter.js';
import { sendEmail } from '../notifications/emailAdapter.js';

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });

export const notificationWorker = new Worker('notification-dispatch', async (job) => {
  const { notificationId } = job.data;
  const notification = await prisma.notification.findUnique({ where: { id: notificationId }, include: { recipients: true, listing: true } });
  if (!notification) return null;

  // Attempt to deliver via configured channel
  for (const r of notification.recipients) {
    try {
      if (notification.channel === 'WHATSAPP') {
        // find user contact
        if (r.userId) {
          const user = await prisma.user.findUnique({ where: { id: r.userId } });
          if (user?.phone) await sendWhatsApp({ toNumber: user.phone, message: notification.message });
        }
      } else if (notification.channel === 'EMAIL') {
        if (r.userId) {
          const user = await prisma.user.findUnique({ where: { id: r.userId } });
          if (user?.email) await sendEmail({ to: user.email, subject: notification.title, text: notification.message });
        }
      }
      await prisma.notificationRecipient.update({ where: { id: r.id }, data: { deliveredAt: new Date() } });
    } catch (e) {
      await prisma.notificationRecipient.update({ where: { id: r.id }, data: { deliveryError: String(e) } });
      logger.error(e, 'Failed to deliver notification to recipient');
    }
  }
  await prisma.notification.update({ where: { id: notificationId }, data: { sentAt: new Date() } });
  logger.info({ notificationId }, 'Dispatched notification (attempted delivery)');
}, { connection });

new QueueEvents('notification-dispatch', { connection }).on('failed', (e) => logger.error({ e }, 'Notification worker failed'));
