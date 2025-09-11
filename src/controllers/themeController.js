import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

export const themeController = {
  async create(req, res) {
    try {
      const { name, tokens, isActive } = req.body;
      if (!name || typeof tokens === 'undefined') return res.apiError('Missing required fields: name and tokens', 400);
      const item = await prisma.themes.create({ data: { name, tokens, isActive: isActive === undefined ? true : Boolean(isActive) } });
      return res.apiSuccess(item, 'Created', 201);
    } catch (e) {
      logger.error(e, 'Failed to create theme');
      return res.apiError('Failed to create theme', 500);
    }
  },

  async update(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) return res.apiError('Invalid id', 400);
      const { tokens, name, isActive } = req.body;
      const existing = await prisma.themes.findUnique({ where: { id } });
      if (!existing) return res.apiError('Not found', 404);
      const data = {};
      if (typeof tokens !== 'undefined') data.tokens = tokens;
      if (typeof name !== 'undefined') data.name = name;
      if (typeof isActive !== 'undefined') data.isActive = Boolean(isActive);
      const updated = await prisma.themes.update({ where: { id }, data });
      return res.apiSuccess(updated, 'Updated', 200);
    } catch (e) {
      logger.error(e, 'Failed to update theme');
      return res.apiError('Failed to update theme', 500);
    }
  },

  async get(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) return res.apiError('Invalid id', 400);
      const item = await prisma.themes.findUnique({ where: { id } });
      if (!item) return res.apiError('Not found', 404);
      return res.apiSuccess(item, 'OK', 200);
    } catch (e) {
      logger.error(e, 'Failed to fetch theme');
      return res.apiError('Failed to fetch theme', 500);
    }
  },

  async list(req, res) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const perPage = parseInt(req.query.perPage || '50', 10);
      const items = await prisma.themes.findMany({ skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: 'desc' } });
      return res.apiSuccess(items, 'OK', 200);
    } catch (e) {
      logger.error(e, 'Failed to list themes');
      return res.apiError('Failed to list themes', 500);
    }
  }
};

export default themeController;
