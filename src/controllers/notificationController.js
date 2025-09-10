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
  res.apiSuccess(full, 'Created', 201);
  }
};

notificationController.list = async function (req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.perPage || '50', 10);
    const { prisma } = await import('../config/prisma.js');
    const items = await prisma.notification.findMany({ skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: 'desc' }, include: { recipients: { include: { user: { include: { roles: true } } } }, listing: { include: { images: true, user: { include: { roles: true } }, category: true } }, sender: { include: { roles: true } } } });
    return res.apiSuccess(items, 'OK', 200);
  } catch (e) {
    return res.apiError('Failed to list notifications', 500);
  }
};
