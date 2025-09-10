import { createNotification } from '../notifications/dispatcher.js';
import Joi from 'joi';

const schema = Joi.object({ title: Joi.string().required(), message: Joi.string().required(), targetType: Joi.string().valid('USER','ROLE','ALL').default('USER'), recipientUserIds: Joi.array().items(Joi.string()).default([]), role: Joi.string().optional() });

export const notificationController = {
  async send(req, res) {
    const { error, value } = schema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const senderId = req.user?.id;
  const n = await createNotification({ ...value, senderId });
  res.apiSuccess(n, 'Created', 201);
  }
};
