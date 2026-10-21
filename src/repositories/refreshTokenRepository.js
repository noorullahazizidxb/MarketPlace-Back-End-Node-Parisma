import { prisma } from '../config/prisma.js';

// Data access for rotating refresh tokens. Only token hashes are persisted.
export const refreshTokenRepository = {
  create(data) {
    return prisma.refreshToken.create({ data });
  },
  findByHash(tokenHash) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },
  markReplaced(id, replacedById) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date(), replacedById } });
  },
  revokeById(id) {
    return prisma.refreshToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  },
  revokeFamily(familyId) {
    return prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  },
  revokeAllForUser(userId) {
    return prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  },
  deleteExpired(before = new Date()) {
    return prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: before } } });
  }
};
