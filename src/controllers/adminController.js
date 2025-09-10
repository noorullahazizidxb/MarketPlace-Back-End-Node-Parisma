import { prisma } from '../config/prisma.js';

export const adminController = {
  async pendingListings(req, res) {
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.perPage || '20', 10);
    const listings = await prisma.listing.findMany({ where: { status: 'PENDING' }, skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: 'desc' } });
  res.apiSuccess(listings, 'OK', 200);
  },
  async rejectListing(req, res) {
    const id = req.params.id;
    const { reason } = req.body;
    const l = await prisma.listing.update({ where: { id }, data: { status: 'REJECTED' } });
    await prisma.auditLog.create({ data: { listingId: id, action: 'REJECTED', details: { reason, adminId: req.user?.id } } });
  res.apiSuccess(l, 'Rejected', 200);
  },
  async stats(req, res) {
    const total = await prisma.listing.count();
    const pending = await prisma.listing.count({ where: { status: 'PENDING' } });
    const approved = await prisma.listing.count({ where: { status: 'APPROVED' } });
  res.apiSuccess({ total, pending, approved }, 'OK', 200);
  }
};
