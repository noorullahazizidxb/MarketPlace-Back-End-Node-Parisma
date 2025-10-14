import Joi from 'joi';

export const createBlogSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  content: Joi.string().min(1).required(),
  images: Joi.array().items(Joi.string().uri({ allowRelative: true })).default([])
});

export const updateBlogSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  content: Joi.string().min(1).optional(),
  images: Joi.array().items(Joi.string().uri({ allowRelative: true })).optional()
}).min(1);

export const createCommentSchema = Joi.object({
  body: Joi.string().min(1).required()
});
