import Joi from 'joi';

export const auditLogSchema = Joi.object({
  actorId: Joi.string().optional(),
  listingId: Joi.string().optional(),
  action: Joi.string().required(),
  details: Joi.object().optional(),
  ip: Joi.string().optional()
});
