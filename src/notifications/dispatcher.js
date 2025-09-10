import { prisma } from '../config/prisma.js';
import { queues } from '../jobs/queues.js';
import { QUEUES } from '../jobs/queues.js';
import { logger } from '../utils/logger.js';

export async function createNotification({ title, message, channel = 'SYSTEM', targetType = 'USER', senderId = null, listingId = null, recipientUserIds = [], role = null }) {
  const createData = {
    title,
    message,
    channel,
    targetType,
    senderId,
    listingId,
    recipients: {
      create: recipientUserIds.map((u) => ({ userId: u }))
    }
  };
  if (role) createData.recipients.create.push({ role });

  const n = await prisma.notification.create({ data: createData });

  // enqueue dispatch job
  await queues[QUEUES.NOTIFICATION_DISPATCH].add('dispatch', { notificationId: n.id });
  logger.info({ notificationId: n.id }, 'Created notification and enqueued dispatch');
  return n;
}
