import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { queues, QUEUES } from '../jobs/queues.js';

export const adminController = {
  async pendingListings(req, res) {
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.perPage || '20', 10);
    const listings = await prisma.listing.findMany({ where: { status: 'PENDING' }, skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: 'desc' }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } } } });
  res.apiSuccess(listings, 'OK', 200);
  },
  async rejectListing(req, res) {
    const id = req.params.id;
    const { reason } = req.body;
    const l = await prisma.listing.update({ where: { id }, data: { status: 'REJECTED' } });
    await prisma.auditLog.create({ data: { listingId: id, action: 'REJECTED', details: { reason, adminId: req.user?.id } } });
  // reload with relations
  const full = await prisma.listing.findUnique({ where: { id }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } } } });
  res.apiSuccess(full, 'Rejected', 200);
  },
  async stats(req, res) {
    const total = await prisma.listing.count();
    const pending = await prisma.listing.count({ where: { status: 'PENDING' } });
    const approved = await prisma.listing.count({ where: { status: 'APPROVED' } });
  // retention configuration (days)
  const retention = config.retention || {};
  const schedules = config.schedules || {};

    // queue statistics (if queues initialized)
    const queueStats = {};
    try {
      for (const [key, qName] of Object.entries(QUEUES)) {
        const q = queues[qName];
        if (q && typeof q.getJobCounts === 'function') {
          try {
            queueStats[qName] = await q.getJobCounts();
          } catch (e) {
            queueStats[qName] = { error: e.message };
          }
        } else {
          queueStats[qName] = { available: !!q };
        }
      }
    } catch (e) {
      // non-fatal: keep going
    }

  res.apiSuccess({ total, pending, approved, retention, schedules, queueStats }, 'OK', 200);
  }
};
