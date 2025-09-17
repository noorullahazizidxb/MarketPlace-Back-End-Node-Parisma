import { createNotification } from '../notifications/dispatcher.js';
import { notificationSchema } from '../validation/notification.js';

export const notificationController = {
  async send(req, res) {
  const { error, value } = notificationSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const senderId = req.user?.id;
  const n = await createNotification({ ...value, senderId });
  // fetch created notification with relations
  const { prisma } = await import('../config/prisma.js');
  const full = await prisma.notification.findUnique({ where: { id: n.id }, include: { recipients: { include: { user: { include: { roles: true } } } }, listing: { include: { images: true, user: { include: { roles: true } }, category: true } }, sender: { include: { roles: true } } } });
  // emit to recipient users via websocket
  try {
    const { emitToUser } = await import('../websocket/socket.js');
    if (Array.isArray(full.recipients)) {
      for (const r of full.recipients) {
        if (r.userId) emitToUser(r.userId, 'notification:new', full);
      }
    }
  } catch (e) {
    // ignore websocket errors
  }
  res.apiSuccess(full, 'Created', 201);
  }
};

notificationController.list = async function (req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.perPage || '50', 10);
    const { prisma } = await import('../config/prisma.js');
    // If authenticated, scope to notifications targeting this user
    const where = {};
    if (req.user && req.user.id) {
      where.OR = [
        { recipients: { some: { userId: req.user.id } } },
        { targetType: 'ALL' },
        { targetType: 'ROLE', recipients: { some: { role: { not: null } } } }
      ];
    }
  const items = await prisma.notification.findMany({ where, skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: 'desc' }, include: { recipients: { include: { user: { include: { roles: true } } } }, listing: { include: { images: true, user: { include: { roles: true } }, category: true } }, sender: { include: { roles: true } } } });

    // emit current list to user's socket room (if authenticated)
    if (req.user && req.user.id) {
      try {
        const { emitToUser } = await import('../websocket/socket.js');
        emitToUser(req.user.id, 'notifications:list', items);
      } catch (e) {}

      // start background scanner to push new notifications for this user until socket disconnects
      (async () => {
        try {
          const { getIO } = await import('../websocket/socket.js');
          const io = getIO();
          const sent = new Set(items.map(i => i.id));
          while (true) {
            await new Promise(r => setTimeout(r, 2000));
            const room = io.sockets.adapter.rooms.get(`user:${req.user.id}`);
            if (!room || room.size === 0) break;
            // prefer unread notifications for this user
            const fresh = await prisma.notification.findMany({ where: { OR: [ { recipients: { some: { userId: req.user.id, readAt: null } } }, { targetType: 'ROLE', recipients: { some: { role: { in: req.user.roles || [] }, readAt: null } } }, { targetType: 'ALL' } ] }, orderBy: { createdAt: 'asc' }, include: { recipients: { include: { user: true } }, listing: { include: { images: true, user: { include: { roles: true } }, category: true } }, sender: { include: { roles: true } } } });
            for (const n of fresh) {
              if (!sent.has(n.id)) {
                sent.add(n.id);
                const { emitToUser } = await import('../websocket/socket.js');
                emitToUser(req.user.id, 'notification:new', n);
              }
            }
          }
        } catch (e) {
          // ignore scanner errors
        }
      })();
    }

    return res.apiSuccess(items, 'OK', 200);
  } catch (e) {
    return res.apiError('Failed to list notifications', 500);
  }
};

notificationController.get = async function (req, res) {
  try {
    const id = req.params.id;
    const { prisma } = await import('../config/prisma.js');
    const n = await prisma.notification.findUnique({ where: { id }, include: { recipients: { include: { user: { include: { roles: true } } } }, listing: { include: { images: true, user: { include: { roles: true } }, category: true } }, sender: { include: { roles: true } } } });
    if (!n) return res.apiError('Not found', 404);
    return res.apiSuccess(n, 'OK', 200);
  } catch (e) {
    return res.apiError('Failed', 500);
  }
};

notificationController.patch = async function (req, res) {
  try {
    const id = req.params.id;
    const payload = req.body;
    const { prisma } = await import('../config/prisma.js');
    // If client is trying to set readAt for this notification and is authenticated,
    // update the NotificationRecipient record for this user instead.
    if (payload && payload.readAt && req.user && req.user.id) {
      const userId = req.user.id;
      const rec = await prisma.notificationRecipient.findFirst({ where: { notificationId: id, userId } });
      if (!rec) return res.apiError('Not found or not a recipient', 404);
      const updated = await prisma.notificationRecipient.update({ where: { id: rec.id }, data: { readAt: new Date(payload.readAt) } });
      try { const { emitToUser } = await import('../websocket/socket.js'); emitToUser(userId, 'notification:read', { notificationId: id, readAt: updated.readAt }); } catch (e) {}
      return res.apiSuccess({ notificationId: id, readAt: updated.readAt }, 'Patched', 200);
    }

    // Otherwise treat as an admin/system-level notification update
    const updated = await prisma.notification.update({ where: { id }, data: payload });
    return res.apiSuccess(updated, 'Patched', 200);
  } catch (e) {
    return res.apiError('Failed', 500);
  }
};

notificationController.markRead = async function (req, res) {
  try {
    const id = req.params.id;
    const userId = req.user?.id;
    if (!userId) return res.apiError('Unauthorized', 401);
    const { prisma } = await import('../config/prisma.js');
    const rec = await prisma.notificationRecipient.findFirst({ where: { notificationId: id, userId } });
    if (!rec) return res.apiError('Not found or not a recipient', 404);
    const updated = await prisma.notificationRecipient.update({ where: { id: rec.id }, data: { readAt: new Date() } });
    try { const { emitToUser } = await import('../websocket/socket.js'); emitToUser(userId, 'notification:read', { notificationId: id, readAt: updated.readAt }); } catch (e) {}
    return res.apiSuccess({ notificationId: id, readAt: updated.readAt }, 'Marked read', 200);
  } catch (e) {
    return res.apiError('Failed', 500);
  }
};

notificationController.markAllRead = async function (req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.apiError('Unauthorized', 401);
    const { prisma } = await import('../config/prisma.js');
    const at = req.body?.readAt ? new Date(req.body.readAt) : new Date();
    const requestedIds = Array.isArray(req.body?.ids) ? req.body.ids : null;

    let recipients;
    if (requestedIds && requestedIds.length) {
      // Fetch recipient rows for this user matching the requested notification IDs and still unread
      recipients = await prisma.notificationRecipient.findMany({ where: { userId, notificationId: { in: requestedIds }, readAt: null } });
    } else {
      recipients = await prisma.notificationRecipient.findMany({ where: { userId, readAt: null } });
    }

    if (!recipients || !recipients.length) {
      // If requestedIds were provided, compute skipped list for clarity
      if (requestedIds && requestedIds.length) {
        return res.apiSuccess({ updated: 0, skipped: requestedIds }, 'No matching unread notifications', 200);
      }
      return res.apiSuccess({ updated: 0 }, 'No unread notifications', 200);
    }

    const updatedNotificationIds = recipients.map(r => r.notificationId);
    const recipientIds = recipients.map(r => r.id);
    await prisma.notificationRecipient.updateMany({ where: { id: { in: recipientIds } }, data: { readAt: at } });

    // compute skipped ids if requestedIds were provided
    const skipped = requestedIds && requestedIds.length ? requestedIds.filter(id => !updatedNotificationIds.includes(id)) : [];

    // Emit event to the user with ids changed
    try {
      const { emitToUser } = await import('../websocket/socket.js');
      emitToUser(userId, 'notification:read', { notificationIds: updatedNotificationIds, readAt: at });
    } catch (e) {}

    return res.apiSuccess({ updated: updatedNotificationIds.length, updatedNotificationIds, skipped }, 'Marked read', 200);
  } catch (e) {
    return res.apiError('Failed', 500);
  }
};
