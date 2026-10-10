import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { queues, QUEUES } from '../jobs/queues.js';
import { runNotificationDispatch } from '../jobs/handlers.js';
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

  const queue = queues[QUEUES.NOTIFICATION_DISPATCH];
  if (config.workers.enabled && typeof queue?.add === 'function') {
    await queue.add('dispatch', { notificationId: n.id });
    logger.info({ notificationId: n.id }, 'Created notification and enqueued dispatch');
  } else {
    await runNotificationDispatch({ notificationId: n.id });
    logger.info({ notificationId: n.id }, 'Created notification and dispatched inline');
  }

  // emit to recipient users via websocket (fire-and-forget)
  try {
    const full = await prisma.notification.findUnique({ where: { id: n.id }, include: { recipients: true, listing: true, sender: true } });
    const { emitToUser } = await import('../websocket/socket.js');
    for (const r of full.recipients) {
      if (r.userId) emitToUser(r.userId, 'notification:new', full);
    }
  } catch (e) {
    // ignore websocket emit errors
  }
  return n;
}
