import Joi from 'joi';

// Allowed values mirror Prisma enums for NotificationChannel and NotificationTargetType
const CHANNELS = ['SYSTEM', 'EMAIL', 'WHATSAPP', 'PUSH'];
const TARGETS = ['USER', 'ROLE', 'ALL', 'LISTING'];

export const notificationSchema = Joi.object({
  title: Joi.string().required(),
  message: Joi.string().required(),
  channel: Joi.string().valid(...CHANNELS).optional(),
  targetType: Joi.string().valid(...TARGETS).required(),
  recipientUserIds: Joi.array().items(Joi.string()).optional(),
  listingId: Joi.string().optional(),
  meta: Joi.object().optional(),
  triggerEvent: Joi.string().optional()
});

export const notificationRecipientSchema = Joi.object({
  notificationId: Joi.string().required(),
  userId: Joi.string().optional(),
  role: Joi.string().optional(),
  readAt: Joi.date().iso().optional()
});
