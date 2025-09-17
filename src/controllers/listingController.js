import { listingService } from '../services/listingService.js';
import { createListingSchema, approveListingSchema } from '../validation/listing.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/prisma.js';
import { storage } from '../utils/storage.js';

export const listingController = {
  async create(req, res) {
    try {
      // normalize files (upload.any())
      if (!req.file && Array.isArray(req.files) && req.files.length > 0) req.file = req.files[0];
      const payload = { ...req.body };
      // parse JSON fields commonly sent as strings in multipart
      ['images','metadata'].forEach(k => { if (typeof payload[k] === 'string') { try { payload[k] = JSON.parse(payload[k]); } catch (e) {} } });

      const { error, value } = createListingSchema.validate(payload);
  if (error) return res.apiError(error.message, 400);

  const userId = req.user?.id || 'anonymous';
  const listing = await listingService.createListing(value, userId);

  // If files were uploaded in the multipart request, move them into uploads/listings/{id}
  if (Array.isArray(req.files) && req.files.length) {
    const uploadsDir = `uploads/listings/${listing.id}`;
    for (let i = 0; i < req.files.length; i++) {
      const f = req.files[i];
      try {
        const dest = await storage.saveTempTo(uploadsDir, f.path, f.originalname || `img_${i}`);
        const url = `/${dest.replace(/\\/g, '/').replace(/^\/?/, '')}`;
        await prisma.listingImage.create({ data: { listingId: listing.id, url, position: i } });
      } catch (e) {
        logger.warn({ err: e.message }, 'Failed to persist uploaded image');
      }
    }
  }

  // reload full listing with relations for consistent API response
  const full = await prisma.listing.findUnique({ where: { id: listing.id }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } }, notifications: true, feedbacks: { include: { user: { select: { id: true, fullName: true, firstName: true, lastName: true, photo: true } } } } } });
  return res.apiSuccess(full, 'Created', 201);
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

  async listApproved(req, res) {
    try {
      // Return all approved listings without pagination as requested
  const listings = await prisma.listing.findMany({ where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } }, notifications: true, feedbacks: { include: { user: { select: { id: true, fullName: true, firstName: true, lastName: true, photo: true } } } } } });
      const withStats = listings.map(l => {
        const ratings = Array.isArray(l.feedbacks) ? l.feedbacks.map(f => typeof f.rating === 'number' ? f.rating : null).filter(v => v !== null) : [];
        const count = ratings.length;
        const avg = count ? (ratings.reduce((a,b)=>a+b,0) / count) : 0;
        return { ...l, reviewCount: l.feedbacks?.length || 0, averageRating: avg };
      });
      return res.apiSuccess(withStats, 'OK', 200);
    } catch (e) {
      logger.error(e, 'Failed to list approved listings');
      return res.apiError('Failed to list', 500);
    }
  },

  async listPending(req, res) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const perPage = parseInt(req.query.perPage || '20', 10);
  const listings = await prisma.listing.findMany({ where: { status: 'PENDING' }, skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: 'desc' }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } }, notifications: true, feedbacks: { include: { user: { select: { id: true, fullName: true, firstName: true, lastName: true, photo: true } } } } } });
      const withStats = listings.map(l => {
        const ratings = Array.isArray(l.feedbacks) ? l.feedbacks.map(f => typeof f.rating === 'number' ? f.rating : null).filter(v => v !== null) : [];
        const count = ratings.length;
        const avg = count ? (ratings.reduce((a,b)=>a+b,0) / count) : 0;
        return { ...l, reviewCount: l.feedbacks?.length || 0, averageRating: avg };
      });
      return res.apiSuccess(withStats, 'OK', 200);
    } catch (e) {
      logger.error(e, 'Failed to list pending listings');
      return res.apiError('Failed to list', 500);
    }
  },

  async forApproval(req, res) {
    try {
      // only admins should be able to call this endpoint
      if (!req.user || !req.user.roles?.includes('ADMIN')) return res.apiError('Forbidden', 403);
      // fetch pending listings
  const listings = await prisma.listing.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } }, feedbacks: { include: { user: { select: { id: true, fullName: true, firstName: true, lastName: true, photo: true } } } } } });
      // compute basic stats
      const withStats = listings.map(l => {
        const ratings = Array.isArray(l.feedbacks) ? l.feedbacks.map(f => typeof f.rating === 'number' ? f.rating : null).filter(v => v !== null) : [];
        const count = ratings.length;
        const avg = count ? (ratings.reduce((a,b)=>a+b,0) / count) : 0;
        return { ...l, reviewCount: l.feedbacks?.length || 0, averageRating: avg };
      });
      // emit initial batch to approvals room
      let io;
      try {
        const mod = await import('../websocket/socket.js');
        io = mod.getIO();
        mod.emitToApprovals('pending-listings', withStats);
      } catch (e) {
        // socket not initialized or error; continue to return HTTP response
      }

      // start background scanner to push new pending listings until no admin sockets remain
      (async () => {
        try {
          const sent = new Set(withStats.map(l => String(l.id)));
          while (true) {
            // small delay between polls
            await new Promise(r => setTimeout(r, 2000));
            // check if sockets exist in approvals room
            try {
              if (!io) {
                const mod = await import('../websocket/socket.js');
                io = mod.getIO();
              }
            } catch (e) {
              // nothing to do if io not available
              break;
            }
            const room = io.sockets.adapter.rooms.get('approvals');
            if (!room || room.size === 0) break; // no admin clients connected, stop scanner

            // fetch current pending listings
            const current = await prisma.listing.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } }, feedbacks: { include: { user: { select: { id: true, fullName: true, firstName: true, lastName: true, photo: true } } } } } });
            const newOnes = [];
            for (const l of current) {
              if (!sent.has(String(l.id))) {
                sent.add(String(l.id));
                const ratings = Array.isArray(l.feedbacks) ? l.feedbacks.map(f => typeof f.rating === 'number' ? f.rating : null).filter(v => v !== null) : [];
                const count = ratings.length;
                const avg = count ? (ratings.reduce((a,b)=>a+b,0) / count) : 0;
                newOnes.push({ ...l, reviewCount: l.feedbacks?.length || 0, averageRating: avg });
              }
            }
            if (newOnes.length) {
              try {
                const { emitToApprovals } = await import('../websocket/socket.js');
                // emit each new listing immediately
                for (const n of newOnes) emitToApprovals('pending-listing:new', n);
              } catch (e) {
                // ignore emit errors
              }
            }
          }
        } catch (err) {
          logger.error(err, 'Approval scanner failed');
        }
      })();

      return res.apiSuccess(withStats, 'OK', 200);
    } catch (e) {
      logger.error(e, 'Failed to fetch pending for approval');
      return res.apiError('Failed', 500);
    }
  },

  async emitAllForApproval(req, res) {
    try {
      if (!req.user || !req.user.roles?.includes('ADMIN')) return res.apiError('Forbidden', 403);
  const listings = await prisma.listing.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } }, feedbacks: { include: { user: { select: { id: true, fullName: true, firstName: true, lastName: true, photo: true } } } } } });
      const withStats = listings.map(l => {
        const ratings = Array.isArray(l.feedbacks) ? l.feedbacks.map(f => typeof f.rating === 'number' ? f.rating : null).filter(v => v !== null) : [];
        const count = ratings.length;
        const avg = count ? (ratings.reduce((a,b)=>a+b,0) / count) : 0;
        return { ...l, reviewCount: l.feedbacks?.length || 0, averageRating: avg };
      });
      try {
        const { emitToApprovals } = await import('../websocket/socket.js');
        emitToApprovals('pending-listings', withStats);
      } catch (e) {}
      return res.apiSuccess({ emitted: withStats.length }, 'Emitted', 200);
    } catch (e) {
      logger.error(e, 'Failed to emit all pending for approval');
      return res.apiError('Failed', 500);
    }
  },

  async approve(req, res) {
    try {
      const { error, value } = approveListingSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const adminId = req.user?.id || null;
  const listingId = req.params.id;
  const listing = await listingService.approveListing(listingId, adminId, value);
  const full = await prisma.listing.findUnique({ where: { id: listing.id }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } }, notifications: true, feedbacks: true } });
  return res.apiSuccess(full, 'Approved', 200);
    } catch (err) {
      logger.error(err);
      return res.apiError('Internal Server Error', 500);
    }
  }
  ,
  async reject(req, res) {
    try {
      // Only admins can reject
      if (!req.user || !req.user.roles?.includes('ADMIN')) return res.apiError('Forbidden', 403);
      const adminId = req.user.id;
      const listingId = req.params.id;
      const listing = await listingService.rejectListing(listingId, adminId);
      const full = await prisma.listing.findUnique({ where: { id: listing.id }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } }, notifications: true, feedbacks: true } });
      return res.apiSuccess(full, 'Rejected', 200);
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
  const dest = await storage.saveTempTo(uploadsDir, req.file.path, req.file.originalname);
  const url = `/${dest}`;
      const { prisma } = await import('../config/prisma.js');

      // If replace behavior requested, delete previous image by imageId
      if (req.query.replace === 'true' && req.query.imageId) {
        const prev = await prisma.listingImage.findUnique({ where: { id: Number(req.query.imageId) } });
        if (prev) {
          await storage.deletePath(prev.url);
          await prisma.listingImage.delete({ where: { id: prev.id } });
        }
  }

  const img = await prisma.listingImage.create({ data: { listingId: id, url, position: 0 } });
  const full = await prisma.listing.findUnique({ where: { id }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } } } });
  return res.apiSuccess({ image: img, listing: full }, 'Uploaded', 201);
    } catch (e) {
  console.error(e);
  return res.apiError('Upload failed', 500);
    }
  }
  ,
  async getImages(req, res) {
    try {
      const id = req.params.id;
      const images = await prisma.listingImage.findMany({ where: { listingId: id }, orderBy: { position: 'asc' } });
      return res.apiSuccess(images, 'OK', 200);
    } catch (e) {
      logger.error(e, 'Failed to fetch listing images');
      return res.apiError('Failed to fetch images', 500);
    }
  }
  ,
  async listByUser(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.apiError('Unauthorized', 401);
      const page = parseInt(req.query.page || '1', 10);
      const perPage = parseInt(req.query.perPage || '50', 10);
  const listings = await prisma.listing.findMany({ where: { userId }, skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: 'desc' }, include: { images: true, category: true, representatives: { include: { representative: true } }, notifications: true, feedbacks: { include: { user: { select: { id: true, fullName: true, firstName: true, lastName: true, photo: true } } } } } });
      return res.apiSuccess(listings, 'OK', 200);
    } catch (e) {
      logger.error(e, 'Failed to list user listings');
      return res.apiError('Failed to list', 500);
    }
  }
  ,
  async update(req, res) {
    try {
      const id = req.params.id;
      const payload = req.body;
      const data = { ...payload };
      // prevent changing immutable fields
      delete data.id;
      delete data.createdAt;
      delete data.userId;
      const updated = await prisma.listing.update({ where: { id }, data });
      const full = await prisma.listing.findUnique({ where: { id }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } } } });
      return res.apiSuccess(full, 'Updated', 200);
    } catch (e) {
      logger.error(e, 'Failed to update listing');
      return res.apiError('Update failed', 500);
    }
  },

  async patch(req, res) {
    try {
      const id = req.params.id;
      const payload = req.body;
      const data = {};
      // copy only provided fields
      for (const k of Object.keys(payload)) {
        if (['id','createdAt','userId'].includes(k)) continue;
        data[k] = payload[k];
      }
      const updated = await prisma.listing.update({ where: { id }, data });
      const full = await prisma.listing.findUnique({ where: { id }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } } } });
      return res.apiSuccess(full, 'Patched', 200);
    } catch (e) {
      logger.error(e, 'Failed to patch listing');
      return res.apiError('Patch failed', 500);
    }
  }
  ,
  async updateVisibilityAndBindReps(req, res) {
    try {
      const id = req.params.id;
      const { contactVisibility } = req.body || {};
      if (!contactVisibility) return res.apiError('contactVisibility is required', 400);
      // Update the listing's contactVisibility first
      const updated = await prisma.listing.update({ where: { id }, data: { contactVisibility } });
      // Only when HIDE_SELLER, bind representatives matching region/location
      if (contactVisibility === 'HIDE_SELLER') {
        const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true, location: true } });
        const region = listing?.location?.trim();
        if (region) {
          // Find active representatives whose region matches the listing location (case-insensitive)
          const reps = await prisma.representativeInfo.findMany({ where: { active: true } });
          const matched = reps.filter(r => typeof r.region === 'string' && r.region.trim().toLowerCase() === region.toLowerCase());
          for (const rep of matched) {
            // Upsert to avoid duplicates thanks to unique(listingId, representativeId)
            try {
              await prisma.listingRepresentative.create({ data: { listingId: id, representativeId: rep.id } });
            } catch (e) {
              // ignore duplicates or race conditions
            }
          }
        }
      }
      // Return full listing with representatives included
  const full = await prisma.listing.findUnique({ where: { id }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } }, notifications: true, feedbacks: { include: { user: { select: { id: true, fullName: true, firstName: true, lastName: true, photo: true } } } } } });
      return res.apiSuccess(full, 'Updated', 200);
    } catch (e) {
      logger.error(e, 'Failed to update visibility/bind reps');
      return res.apiError('Failed', 500);
    }
  }
};
