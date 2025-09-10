import { prisma } from '../config/prisma.js';
import { assignRoleSchema } from '../validation/userRole.js';
import { Roles } from '../constants/enums.js';

export const roleController = {
  async assign(req, res) {
  const { error, value } = assignRoleSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const data = await prisma.userRole.create({ data: { userId: value.userId, role: value.role }, include: { user: { include: { roles: true, listings: { include: { images: true, category: true } }, representative: true } } } });
  res.apiSuccess(data, 'Assigned', 201);
  },
  async listUserRoles(req, res) {
    const userId = req.params.userId;
  const roles = await prisma.userRole.findMany({ where: { userId }, include: { user: { include: { roles: true, listings: { include: { images: true, category: true } }, representative: true } } } });
  res.apiSuccess(roles, 'OK', 200);
  }
};
