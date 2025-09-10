import Joi from 'joi';

export const listingImageSchema = Joi.object({
  url: Joi.string().pattern(/^\/|^https?:\/\//).required(),
  alt: Joi.string().optional(),
  position: Joi.number().integer().optional()
});
