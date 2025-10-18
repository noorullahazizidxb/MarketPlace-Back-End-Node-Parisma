import { prisma } from '../config/prisma.js';

export const contactRepository = {
  async create(data) {
    return prisma.contact.create({ data });
  },
  async getById(id) {
    return prisma.contact.findUnique({ where: { id } });
  },
  async list() {
    return prisma.contact.findMany({ orderBy: { createdAt: 'desc' } });
  }
};
