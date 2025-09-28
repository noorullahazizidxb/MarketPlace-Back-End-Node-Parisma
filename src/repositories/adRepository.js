import { prisma } from '../config/prisma.js';

export const adRepository = {
  async create(data) {
    return await prisma.ad.create({ data });
  },
  async update(id, data) {
    return await prisma.ad.update({ where: { id }, data });
  },
  async delete(id) {
    return await prisma.ad.delete({ where: { id } });
  },
  async getById(id) {
    return await prisma.ad.findUnique({ where: { id } });
  },
  async list(filter = {}, opts = {}) {
    const where = {};
    if (filter.placement) where.placement = filter.placement;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    const take = opts.take || 50;
    const skip = opts.skip || 0;
    return await prisma.ad.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } });
  }
};
