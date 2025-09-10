import { listingService } from '../services/listingService.js';
import { createListingSchema, approveListingSchema } from '../validation/listing.js';
import { logger } from '../utils/logger.js';

export const listingController = {
  async create(req, res) {
    try {
      const { error, value } = createListingSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);

  const userId = req.user?.id || 'anonymous';
  const listing = await listingService.createListing(value, userId);
  return res.apiSuccess(listing, 'Created', 201);
    } catch (err) {
      logger.error(err);
      return res.apiError('Internal Server Error', 500);
    }
  },

  async get(req, res) {
    try {
      const id = req.params.id;
      const listing = await listingService.getListing(id);
  if (!listing) return res.apiError('Not found', 404);
  return res.apiSuccess(listing, 'OK', 200);
    } catch (err) {
      logger.error(err);
      return res.apiError('Internal Server Error', 500);
    }
  },

  async approve(req, res) {
    try {
      const { error, value } = approveListingSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const adminId = req.user?.id || null;
  const listingId = req.params.id;
  const listing = await listingService.approveListing(listingId, adminId, value);
  return res.apiSuccess(listing, 'Approved', 200);
    } catch (err) {
      logger.error(err);
      return res.apiError('Internal Server Error', 500);
    }
  }
  ,
  async uploadImage(req, res) {
    try {
      const id = req.params.id;
  if (!req.file) return res.apiError('No file uploaded', 400);
      const uploadsDir = `uploads/listings/${id}`;
      const { storage } = await import('../utils/storage.js');
      const dest = storage.saveTempTo(uploadsDir, req.file.path, req.file.originalname);
      const url = `/${dest}`;
      const { prisma } = await import('../config/prisma.js');

      // If replace behavior requested, delete previous image by imageId
      if (req.query.replace === 'true' && req.query.imageId) {
        const prev = await prisma.listingImage.findUnique({ where: { id: Number(req.query.imageId) } });
        if (prev) {
          storage.deletePath(prev.url);
          await prisma.listingImage.delete({ where: { id: prev.id } });
        }
      }

  await prisma.listingImage.create({ data: { listingId: id, url, position: 0 } });
  return res.apiSuccess({ url }, 'Uploaded', 201);
    } catch (e) {
  console.error(e);
  return res.apiError('Upload failed', 500);
    }
  }
};
