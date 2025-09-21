import { prisma } from '../config/prisma.js';
import { nanoid } from 'nanoid';

export const renewRepository = {
  async createToken(listingId, expiresAt) {
    const token = nanoid();
    try {
      return await prisma.listingRenewToken.create({ data: { listing: { connect: { id: listingId } }, token, expiresAt, renewCount: 0 } });
    } catch (err) {
      // Fallback for environments where Prisma schema/client wasn't regenerated and renewCount is unknown
      if (err && err.message && err.message.includes('Unknown argument `renewCount`')) {
        return prisma.listingRenewToken.create({ data: { listing: { connect: { id: listingId } }, token, expiresAt } });
      }
      throw err;
    }
  },
  async findByToken(token) {
    return prisma.listingRenewToken.findUnique({ where: { token } });
  }
};
