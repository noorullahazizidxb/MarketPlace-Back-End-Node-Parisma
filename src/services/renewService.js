import { renewRepository } from '../repositories/renewRepository.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';

export const renewService = {
  async issueToken(listingId) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.retention.renewWindowDays);
    const token = await renewRepository.createToken(listingId, expiresAt);
    return token;
  },
  async redeemToken(tokenStr) {
    const token = await renewRepository.findByToken(tokenStr);
    if (!token || token.used || new Date(token.expiresAt) < new Date()) throw new Error('Invalid or expired token');
    // extend listing expiry
    const listing = await prisma.listing.update({ where: { id: token.listingId }, data: { expiresAt: new Date(new Date().setDate(new Date().getDate() + config.retention.listingDefaultExpiryDays)) } });
    await renewRepository.markUsed(token.id);
    return listing;
  }
};
