import { prisma } from '../config/prisma.js';

export const userRepository = {
  async create(data) {
  return prisma.user.create({ data });
  },
  async findByEmail(email) {
  // include passwordHash for authentication flows (use select to avoid include+select conflict)
  return prisma.user.findUnique({ where: { email }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true,metadata:true, passwordHash: true, roles: true } });
  },
  async findById(id) {
  return prisma.user.findUnique({ where: { id }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true,meatadata:true, roles: true } });
  }
};
