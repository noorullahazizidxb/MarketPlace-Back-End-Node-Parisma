import { prisma } from '../config/prisma.js';
import Joi from 'joi';
import { Roles } from '../constants/enums.js';

const assignSchema = Joi.object({ userId: Joi.string().required(), role: Joi.string().valid('ADMIN','USER','REPRESENTATIVE').required() });

export const roleController = {
  async assign(req, res) {
    const { error, value } = assignSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const data = await prisma.userRole.create({ data: { userId: value.userId, role: value.role } });
  res.apiSuccess(data, 'Assigned', 201);
  },
  async listUserRoles(req, res) {
    const userId = req.params.userId;
  const roles = await prisma.userRole.findMany({ where: { userId } });
  res.apiSuccess(roles, 'OK', 200);
  }
};
