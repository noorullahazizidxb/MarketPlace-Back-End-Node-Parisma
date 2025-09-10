import { prisma } from '../config/prisma.js';
import { nanoid } from 'nanoid';

export const renewRepository = {
  async createToken(listingId, expiresAt) {
    const token = nanoid();
    return prisma.listingRenewToken.create({ data: { listing: { connect: { id: listingId } }, token, expiresAt } });
  },
  async findByToken(token) {
    return prisma.listingRenewToken.findUnique({ where: { token } });
  },
  async markUsed(id) {
    return prisma.listingRenewToken.update({ where: { id }, data: { used: true } });
  }
};
