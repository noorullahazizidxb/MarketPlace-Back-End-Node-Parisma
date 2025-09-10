import Joi from 'joi';

export const searchIndexSchema = Joi.object({
  listingId: Joi.string().required(),
  payload: Joi.object().required(),
  version: Joi.number().integer().optional()
});
