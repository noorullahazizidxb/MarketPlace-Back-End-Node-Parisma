import { prisma } from '../config/prisma.js';
import { assignRoleSchema } from '../validation/userRole.js';
import { Roles } from '../constants/enums.js';

export const roleController = {
  async assign(req, res) {
  const { error, value } = assignRoleSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const data = await prisma.userRole.create({ data: { userId: value.userId, role: value.role }, include: { user: { include: { roles: true, listings: { include: { images: true, category: true } }, representatives: true } } } });
  res.apiSuccess(data, 'Assigned', 201);
  },
  async listUserRoles(req, res) {
    const userId = req.params.userId;
  const roles = await prisma.userRole.findMany({ where: { userId }, include: { user: { include: { roles: true, listings: { include: { images: true, category: true } }, representatives: true } } } });
  res.apiSuccess(roles, 'OK', 200);
  }
};

// list all role assignments (admin)
roleController.listAll = async function (req, res) {
  try {
  const roles = await prisma.userRole.findMany({ include: { user: { include: { roles: true, listings: { include: { images: true, category: true } }, representatives: true } } } });
    return res.apiSuccess(roles, 'OK', 200);
  } catch (e) {
    return res.apiError('Failed to list roles', 500);
  }
};

roleController.get = async function (req, res) {
  const id = Number(req.params.id);
  const r = await prisma.userRole.findUnique({ where: { id }, include: { user: { include: { roles: true, listings: { include: { images: true, category: true } }, representatives: true } } } });
  if (!r) return res.apiError('Not found', 404);
  res.apiSuccess(r, 'OK', 200);
};

roleController.update = async function (req, res) {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    const updated = await prisma.userRole.update({ where: { id }, data });
    res.apiSuccess(updated, 'Updated', 200);
  } catch (e) { res.apiError('Failed', 500); }
};

roleController.patch = async function (req, res) {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    const data = {};
    for (const k of Object.keys(payload)) data[k] = payload[k];
    const updated = await prisma.userRole.update({ where: { id }, data });
    res.apiSuccess(updated, 'Patched', 200);
  } catch (e) { res.apiError('Failed', 500); }
};

roleController.remove = async function (req, res) {
  try {
    const id = Number(req.params.id);
    await prisma.userRole.delete({ where: { id } });
    res.apiSuccess(null, 'Deleted', 200);
  } catch (e) { res.apiError('Failed', 500); }
};
