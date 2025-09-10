import { prisma } from '../config/prisma.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { storage } from '../utils/storage.js';

export const userController = {
  async uploadPhoto(req, res) {
    try {
      const userId = req.user?.id;
  if (!userId) return res.apiError('Unauthorized', 401);
  if (!req.file) return res.apiError('No file uploaded', 400);

      // move file from multer tmp to uploads/users/{userId}_{originalname}
      const uploadsDir = path.join('uploads', 'users');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const dest = storage.saveTempTo(uploadsDir, req.file.path, `${userId}_${req.file.originalname}`);
  const url = `/${dest}`;
  // delete previous photo if present
  const prev = (await prisma.user.findUnique({ where: { id: userId } })).photo;
  if (prev) storage.deletePath(prev);
  const user = await prisma.user.update({ where: { id: userId }, data: { photo: url } });
  res.apiSuccess({ photo: url, user }, 'Uploaded', 201);
    } catch (e) {
      logger.error(e, 'Failed to upload user photo');
  res.apiError('Upload failed', 500);
    }
  }
};
