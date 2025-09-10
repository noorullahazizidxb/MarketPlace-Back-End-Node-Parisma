import { forwardingService } from '../services/forwardingService.js';
import { listingRepresentativeSchema } from '../validation/representative.js';
import { forwardListingSchema } from '../validation/forwarding.js';

export const forwardController = {
  async forward(req, res) {
  const { error, value } = forwardListingSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const results = await forwardingService.forwardToRepresentatives(value);
  // enrich results with representative and listing data
  const { prisma } = await import('../config/prisma.js');
  const reps = await prisma.representativeInfo.findMany({ where: { region: value.region }, include: { user: { include: { roles: true } } } });
  const listing = await prisma.listing.findUnique({ where: { id: value.listingId }, include: { images: true, user: { include: { roles: true } }, category: true } });
  return res.apiSuccess({ results, representatives: reps, listing }, 'Forwarded', 200);
  }
};
