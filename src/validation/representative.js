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

// Schema for binding one or many representative info records to an existing user
export const bindRepresentativeSchema = Joi.object({
  userId: Joi.string().required(),
  representativeInfo: Joi.alternatives().try(
    representativeInfoSchema,
    Joi.array().items(representativeInfoSchema)
  ).required()
});
