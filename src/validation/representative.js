import Joi from 'joi';

export const representativeInfoSchema = Joi.object({
  region: Joi.string().required(),
  whatsappNumber: Joi.string().optional(),
  active: Joi.boolean().optional()
});

export const listingRepresentativeSchema = Joi.object({
  listingId: Joi.string().required(),
  representativeId: Joi.number().integer().required(),
  assignedAt: Joi.date().iso().optional()
});
