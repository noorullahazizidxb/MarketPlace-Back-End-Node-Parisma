import Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  slug: Joi.string().min(1).max(200).optional(),
  parentId: Joi.number().integer().optional(),
  isActive: Joi.boolean().optional()
});
