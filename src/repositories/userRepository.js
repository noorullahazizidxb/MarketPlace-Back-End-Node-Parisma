import { prisma } from '../config/prisma.js';

export const userRepository = {
  async create(data) {
    return prisma.user.create({ data });
  },
  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },
  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  }
};
