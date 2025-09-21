import { renewRepository } from '../repositories/renewRepository.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';

export const renewService = {
  async issueToken(listingId) {
    // Only issue for approved listings; ensure single active token per listing
    const { prisma } = await import('../config/prisma.js');
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new Error('Listing not found');
    if (listing.status !== 'APPROVED') throw new Error('Cannot issue token for non-approved listing');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.retention.renewWindowDays);
    // If listing.expiresAt is null or earlier than new expiry, extend it too
    if (!listing.expiresAt || new Date(listing.expiresAt) < expiresAt) {
      try { await prisma.listing.update({ where: { id: listing.id }, data: { expiresAt } }); } catch (e) {}
    }
    // Upsert: if a token exists, update its expiry and mark unused
    const existing = await prisma.listingRenewToken.findUnique({ where: { listingId: listingId } });
    if (existing) {
      return prisma.listingRenewToken.update({ where: { id: existing.id }, data: { expiresAt } });
    }
    return renewRepository.createToken(listingId, expiresAt);
  },
  async redeemToken(tokenStr) {
    const token = await renewRepository.findByToken(tokenStr);
    if (!token || new Date(token.expiresAt) < new Date()) throw new Error('Invalid or expired token');
    // Extend both listing and token expiry by renewWindowDays from now (unlimited renews)
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + config.retention.renewWindowDays);
    const listing = await prisma.listing.update({ where: { id: token.listingId }, data: { expiresAt: newExpiry } });
    let updatedToken;
    try {
      updatedToken = await prisma.listingRenewToken.update({ where: { id: token.id }, data: { expiresAt: newExpiry, renewCount: { increment: 1 } } });
    } catch (err) {
      // Fallback if migration not yet applied (renewCount column missing in Prisma client or DB)
      if (err.message && err.message.includes('Unknown argument `renewCount`')) {
        updatedToken = await prisma.listingRenewToken.update({ where: { id: token.id }, data: { expiresAt: newExpiry } });
      } else {
        throw err;
      }
    }
    // Also increment legacy 'used' column numerically if it exists (compat with older schema / user expectation)
    let legacyUsedCount;
    try {
      await prisma.$executeRaw`UPDATE ListingRenewToken SET used = used + 1 WHERE id = ${token.id}`;
      const refreshed = await prisma.listingRenewToken.findUnique({ where: { id: token.id } });
      if (refreshed && typeof refreshed.used !== 'undefined') legacyUsedCount = refreshed.used;
      // If renewCount missing (fallback path), adopt legacy used count as display value
      if (!('renewCount' in updatedToken) && refreshed) updatedToken = refreshed;
    } catch (e) { /* ignore */ }
    // Single notification per renewal action
    try {
      await prisma.notification.create({
        data: {
          title: 'Listing renewed',
            message: `Your listing "${listing.title}" has been renewed until ${newExpiry.toISOString()}${typeof updatedToken.renewCount === 'number' ? ` (total renewals: ${updatedToken.renewCount})` : (typeof legacyUsedCount === 'number' ? ` (total renewals: ${legacyUsedCount})` : '')}.`,
          channel: 'SYSTEM',
          targetType: 'USER',
          listingId: listing.id,
          triggerEvent: 'LISTING_RENEWED',
          recipients: { create: [{ userId: listing.userId }] }
        }
      });
      try { const { emitToUser } = await import('../websocket/socket.js'); emitToUser(listing.userId, 'notification:new', { type: 'LISTING_RENEWED', listingId: listing.id, expiresAt: newExpiry }); } catch (e) {}
    } catch (e) {}
    return listing;
  }
};
