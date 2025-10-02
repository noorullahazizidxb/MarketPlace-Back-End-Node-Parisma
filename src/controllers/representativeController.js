import { representativeService } from '../services/representativeService.js';
import { representativeInfoSchema, bindRepresentativeSchema } from '../validation/representative.js';
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

// Bind existing user (self or admin) to representative info (one or many entries)
representativeController.bind = async function (req, res) {
  try {
    const body = { ...req.body };
    if (typeof body.representativeInfo === 'string') {
      try { body.representativeInfo = JSON.parse(body.representativeInfo); } catch (e) {}
    }
    const { error, value } = bindRepresentativeSchema.validate(body, { abortEarly: false });
    if (error) return res.apiError(error.details.map(d => d.message).join(', '), 400);

    const requester = req.user;
    const isSelf = requester && requester.id === value.userId;
    const isAdmin = requester && Array.isArray(requester.roles) && requester.roles.some(r => r.role === 'ADMIN' || r === 'ADMIN');
    if (!isSelf && !isAdmin) return res.apiError('Not authorized', 403);

    const user = await prisma.user.findUnique({ where: { id: value.userId } });
    if (!user) return res.apiError('User not found', 404);

    const created = await representativeService.bindMany(value.userId, value.representativeInfo);
    // ensure representative role exists
    try {
      const hasRole = await prisma.userRole.findFirst({ where: { userId: value.userId, role: 'REPRESENTATIVE' } });
      if (!hasRole) await prisma.userRole.create({ data: { userId: value.userId, role: 'REPRESENTATIVE' } });
    } catch (e) {}

    return res.apiSuccess({ count: created.length, representatives: created }, 'Bound', 201);
  } catch (e) {
    return res.apiError('Failed to bind representative info', 500);
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
