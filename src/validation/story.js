import Joi from 'joi';

export const createStorySchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().min(1).required(),
  images: Joi.array().items(Joi.string().uri({ allowRelative: true })).default([]),
  videoUrl: Joi.string().uri({ allowRelative: false }).optional().allow(null, ''),
});

export const updateStorySchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().min(1).optional(),
  images: Joi.array().items(Joi.string().uri({ allowRelative: true })).optional(),
  videoUrl: Joi.string().uri({ allowRelative: false }).optional().allow(null, ''),
}).min(1);
