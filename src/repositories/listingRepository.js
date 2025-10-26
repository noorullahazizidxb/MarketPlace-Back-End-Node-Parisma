import { prisma } from '../config/prisma.js';
import { storage } from '../utils/storage.js';

export const listingRepository = {
  async create(data) {
    return prisma.listing.create({ data });
  },

  async getById(id) {
    return prisma.listing.findUnique({
      where: { id },
      include: {
  images: true,
  representatives: { include: { representative: true } },
  user: { include: { roles: true } },
  category: true,
  feedbacks: { include: { user: { select: { id: true, fullName: true, firstName: true, lastName: true, photo: true } } } }
      }
    });
  },

  async update(id, data) {
    return prisma.listing.update({ where: { id }, data });
  },

  async delete(id) {
    // remove listing images directory and any assets (await filesystem ops)
    try {
      const dir = `uploads/listings/${id}`;
      await storage.deleteDirectory(dir);
    } catch (e) {
      // ignore filesystem failures but log if needed in caller
    }

    // remove any listing images rows first to keep DB clean, then delete listing row
    try {
      await prisma.listingImage.deleteMany({ where: { listingId: id } });
    } catch (e) {
      // ignore if table relations or cascade already handle it
    }

    return prisma.listing.delete({ where: { id } });
  },

  async list(filters = {}, opts = {}) {
    // Basic prisma listing; text search should be done via Elasticsearch
    const where = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.listingType) where.listingType = filters.listingType;
    if (filters.categoryId) where.categoryId = Number(filters.categoryId);
    if (filters.createdBefore) where.createdAt = { lt: new Date(filters.createdBefore) };

    const take = opts.limit || 20;
    const skip = opts.offset || 0;

  return prisma.listing.findMany({ where, take, skip, orderBy: { createdAt: 'desc' }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } } } });
  },

  async findUnapprovedOlderThan(cutoffDate) {
    return prisma.listing.findMany({ where: { status: 'PENDING', createdAt: { lt: cutoffDate } } });
  }
};
