import { renewService } from '../services/renewService.js';
import { issueRenewSchema, redeemRenewSchema } from '../validation/renew.js';

export const renewController = {
  async issue(req, res) {
  const { error, value } = issueRenewSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const token = await renewService.issueToken(value.listingId);
  res.apiSuccess({ token }, 'Issued', 200);
  },
  async redeem(req, res) {
  const { error, value } = redeemRenewSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
    try {
  const listing = await renewService.redeemToken(value.token);
  // reload listing with relations for response
  const { prisma } = await import('../config/prisma.js');
  const full = await prisma.listing.findUnique({ where: { id: listing.id }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } } } });
  res.apiSuccess(full, 'Redeemed', 200);
    } catch (e) {
      res.apiError(e.message, 400);
    }
  }
};
