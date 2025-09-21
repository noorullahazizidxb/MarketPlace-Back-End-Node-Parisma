import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

export const listingFeedbackController = {
  // Create a feedback for a listing (authenticated users)
  async create(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.apiError('Unauthorized', 401);
      const payload = req.body || {};
      const { listingId, rating, comment, statusAfter } = payload;
      if (!listingId) return res.apiError('listingId is required', 400);
      // Optional: prevent duplicate feedbacks by same user for same listing if desired
      const fb = await prisma.listingFeedback.create({ data: { listingId, userId, rating: rating ?? null, comment: comment ?? null, statusAfter: statusAfter ?? undefined } });
      const full = await prisma.listingFeedback.findUnique({ where: { id: fb.id }, include: { user: { include: { roles: true } } } });
      // Invalidate cached listing so subsequent GET /listing/:id returns fresh feedbacks
      try { const { redisDel } = await import('../utils/redisCache.js'); await redisDel(`listing:${listingId}`); } catch (e) {}
      return res.apiSuccess(full, 'Created', 201);
    } catch (e) {
      logger.error(e, 'Failed to create feedback');
      return res.apiError('Failed', 500);
    }
  },

  // List feedbacks for a listing
  async listByListing(req, res) {
    try {
      const listingId = req.params.listingId;
      if (!listingId) return res.apiError('listingId required', 400);
      const page = parseInt(req.query.page || '1', 10);
      const perPage = parseInt(req.query.perPage || '50', 10);
      const items = await prisma.listingFeedback.findMany({ where: { listingId }, include: { user: { select: { id: true, fullName: true, photo: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage });
      return res.apiSuccess(items, 'OK', 200);
    } catch (e) {
      logger.error(e, 'Failed to list feedbacks');
      return res.apiError('Failed', 500);
    }
  },

  // Get feedback by id
  async get(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) return res.apiError('id required', 400);
      const fb = await prisma.listingFeedback.findUnique({ where: { id }, include: { user: { select: { id: true, fullName: true, photo: true } } } });
      if (!fb) return res.apiError('Not found', 404);
      return res.apiSuccess(fb, 'OK', 200);
    } catch (e) {
      logger.error(e, 'Failed to get feedback');
      return res.apiError('Failed', 500);
    }
  },

  // Delete feedback (owner or admin)
  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) return res.apiError('id required', 400);
      const userId = req.user?.id;
      if (!userId) return res.apiError('Unauthorized', 401);
      const fb = await prisma.listingFeedback.findUnique({ where: { id } });
      if (!fb) return res.apiError('Not found', 404);
      const roles = req.user.roles || [];
      if (fb.userId !== userId && !roles.includes('ADMIN')) return res.apiError('Forbidden', 403);
      await prisma.listingFeedback.delete({ where: { id } });
      try { const { redisDel } = await import('../utils/redisCache.js'); await redisDel(`listing:${fb.listingId}`); } catch (e) {}
      return res.apiSuccess({}, 'Deleted', 200);
    } catch (e) {
      logger.error(e, 'Failed to delete feedback');
      return res.apiError('Failed', 500);
    }
  }
};

export default listingFeedbackController;
