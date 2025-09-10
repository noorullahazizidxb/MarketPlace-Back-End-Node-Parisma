import Joi from 'joi';

export const listingRenewTokenSchema = Joi.object({
  listingId: Joi.string().required(),
  token: Joi.string().required(),
  expiresAt: Joi.date().iso().required(),
  used: Joi.boolean().optional()
});
