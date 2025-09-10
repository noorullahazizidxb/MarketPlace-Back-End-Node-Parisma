import { prisma } from '../config/prisma.js';
import path from 'path';
import { logger } from '../utils/logger.js';
import { storage } from '../utils/storage.js';
import { updateUserSchema } from '../validation/user.js';

export const userController = {
  async uploadPhoto(req, res) {
    try {
      const userId = req.user?.id;
  if (!userId) return res.apiError('Unauthorized', 401);
  if (!req.file) return res.apiError('No file uploaded', 400);

    // move file from multer tmp to uploads/users/{userId}_{originalname}
    const uploadsDir = path.join('uploads', 'users');
  const dest = await storage.saveTempTo(uploadsDir, req.file.path, `${userId}_${req.file.originalname}`);
  const url = `/${dest}`;
  // delete previous photo if present
  const prev = (await prisma.user.findUnique({ where: { id: userId } })).photo;
  if (prev) await storage.deletePath(prev);
  await prisma.user.update({ where: { id: userId }, data: { photo: url } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true, roles: true, listings: { include: { images: true, category: true } }, representative: true } });
  res.apiSuccess({ photo: url, user }, 'Uploaded', 201);
    } catch (e) {
      logger.error(e, 'Failed to upload user photo');
  res.apiError('Upload failed', 500);
    }
  }
  ,
  async updateProfile(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.apiError('Unauthorized', 401);
  const { error, value } = updateUserSchema.validate(req.body);
      if (error) return res.apiError(error.message, 400);
      const { firstName, lastName, contacts, address } = value;
      const data = {};
      if (firstName !== undefined) data.firstName = firstName;
      if (lastName !== undefined) data.lastName = lastName;
      if (contacts !== undefined) data.contacts = contacts;
      if (address !== undefined) data.address = address;
      if (firstName || lastName) data.fullName = `${firstName || ''}${firstName && lastName ? ' ' : ''}${lastName || ''}`.trim();
  await prisma.user.update({ where: { id: userId }, data });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true, roles: true, listings: { include: { images: true, category: true } }, representative: true } });
  res.apiSuccess(user, 'Updated', 200);
    } catch (e) {
      logger.error(e, 'Failed to update profile');
      res.apiError('Update failed', 500);
    }
  }
};
