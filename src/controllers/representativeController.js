import { representativeService } from '../services/representativeService.js';
import { representativeInfoSchema } from '../validation/representative.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

export const representativeController = {
  async create(req, res) {
  const { error, value } = representativeInfoSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const userId = req.user?.id;
  const rep = await representativeService.create(value, userId);
  res.apiSuccess(rep, 'Created', 201);
  },

  async listByRegion(req, res) {
    const region = req.query.region;
  const reps = await representativeService.listByRegion(region);
  res.apiSuccess(reps, 'OK', 200);
  }
};

representativeController.get = async function (req, res) {
  const id = Number(req.params.id);
  const rep = await prisma.representativeInfo.findUnique({ where: { id }, include: { user: { include: { roles: true } } } });
  if (!rep) return res.apiError('Not found', 404);
  res.apiSuccess(rep, 'OK', 200);
};

representativeController.update = async function (req, res) {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    const updated = await prisma.representativeInfo.update({ where: { id }, data });
    res.apiSuccess(updated, 'Updated', 200);
  } catch (e) {
    res.apiError('Failed to update', 500);
  }
};

representativeController.patch = async function (req, res) {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    const data = {};
    for (const k of Object.keys(payload)) data[k] = payload[k];
    const updated = await prisma.representativeInfo.update({ where: { id }, data });
    res.apiSuccess(updated, 'Patched', 200);
  } catch (e) {
    res.apiError('Failed to patch', 500);
  }
};
