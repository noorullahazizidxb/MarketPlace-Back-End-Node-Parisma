import { categoryService } from '../services/categoryService.js';
import Joi from 'joi';

const createSchema = Joi.object({ name: Joi.string().required(), slug: Joi.string().required(), parentId: Joi.number().optional() });

export const categoryController = {
  async create(req, res) {
    const { error, value } = createSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const cat = await categoryService.create(value);
  res.apiSuccess(cat, 'Created', 201);
  },

  async list(req, res) {
    const cats = await categoryService.list();
  res.apiSuccess(cats, 'OK', 200);
  }
};
