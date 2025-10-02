import { categoryService } from '../services/categoryService.js';
import { createCategorySchema } from '../validation/category.js';
import { prisma } from '../config/prisma.js';
import { categoryRepository } from '../repositories/categoryRepository.js';

export const categoryController = {
  async create(req, res) {
  const { error, value } = createCategorySchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const cat = await categoryService.create(value);
  const full = await categoryRepository.getById(cat.id);
  res.apiSuccess(full, 'Created', 201);
  },

  async list(req, res) {
    // Return all categories without pagination
  const cats = await categoryRepository.list();
    res.apiSuccess(cats, 'OK', 200);
  }
};

categoryController.get = async function (req, res) {
  const id = Number(req.params.id);
  const cat = await categoryRepository.getById(id);
  if (!cat) return res.apiError('Not found', 404);
  res.apiSuccess(cat, 'OK', 200);
};

categoryController.update = async function (req, res) {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    const updated = await prisma.category.update({ where: { id }, data });
  const full = await categoryRepository.getById(id);
    res.apiSuccess(full, 'Updated', 200);
  } catch (e) {
    res.apiError('Failed to update', 500);
  }
};

categoryController.patch = async function (req, res) {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    const data = {};
    for (const k of Object.keys(payload)) data[k] = payload[k];
    const updated = await prisma.category.update({ where: { id }, data });
  const full = await categoryRepository.getById(id);
    res.apiSuccess(full, 'Patched', 200);
  } catch (e) {
    res.apiError('Failed to patch', 500);
  }
};
