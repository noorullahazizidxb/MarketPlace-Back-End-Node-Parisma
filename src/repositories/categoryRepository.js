import { prisma } from '../config/prisma.js';

export const categoryRepository = {
  async create(data) {
    return prisma.category.create({ data });
  },
  async getById(id) {
    return prisma.category.findUnique({ where: { id }, include: { parent: true, children: true, listings: { include: { images: true, representatives: { include: { representative: true } } } } } });
  },
  async list() {
    return prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, include: { parent: true, children: true, listings: { include: { images: true, representatives: { include: { representative: true } } } } } });
  }
};
