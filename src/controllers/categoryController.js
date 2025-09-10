import { categoryService } from '../services/categoryService.js';
import { createCategorySchema } from '../validation/category.js';

export const categoryController = {
  async create(req, res) {
    const { error, value } = createSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const cat = await categoryService.create(value);
  const full = await prisma.category.findUnique({ where: { id: cat.id }, include: { children: true, listings: { include: { images: true, user: { include: { roles: true } } } } } });
  res.apiSuccess(full, 'Created', 201);
  },

  async list(req, res) {
    const cats = await categoryService.list();
  res.apiSuccess(cats, 'OK', 200);
  }
};
