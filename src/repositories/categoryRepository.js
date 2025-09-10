import { prisma } from '../config/prisma.js';

export const categoryRepository = {
  async create(data) {
    return prisma.category.create({ data });
  },
  async getById(id) {
    return prisma.category.findUnique({ where: { id } });
  },
  async list() {
    return prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }
};
