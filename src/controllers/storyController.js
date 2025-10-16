import { createStorySchema, updateStorySchema } from '../validation/story.js';
import { storyService } from '../services/storyService.js';
import { logger } from '../utils/logger.js';
import { storage } from '../utils/storage.js';
import { prisma } from '../config/prisma.js';

export const storyController = {
  async create(req, res) {
    try {
      // admin check (only admin users can post Story items)
      if (!req.user || !req.user.roles?.includes('ADMIN')) return res.apiError('Forbidden', 403);
      const payload = { ...req.body };
      // parse JSON images if provided as string (multipart cases)
      if (typeof payload.images === 'string') { try { payload.images = JSON.parse(payload.images); } catch (e) {} }
      const { error, value } = createStorySchema.validate(payload);
      if (error) return res.apiError(error.message, 400);
      const story = await storyService.createStory(value, req.user.id);
      // If files uploaded via multipart, persist them to uploads/stories/{id} and attach URLs
      if (Array.isArray(req.files) && req.files.length) {
        try {
          const uploadsDir = `uploads/stories/${story.id}`;
          const urls = [];
          for (let i = 0; i < req.files.length; i++) {
            const f = req.files[i];
            try {
              const dest = await storage.saveTempTo(uploadsDir, f.path, f.originalname || `img_${i}`);
              const url = `/${dest.replace(/\\/g, '/').replace(/^\/?/, '')}`;
              urls.push(url);
            } catch (e) {
              logger.warn({ err: e?.message, file: f.originalname }, 'Failed to persist uploaded story image');
            }
          }
          if (urls.length) {
            // create story images records
            try { await prisma.storyImage.createMany({ data: urls.map((u, idx) => ({ storyId: story.id, url: u, position: idx })) }); } catch (e) { logger.warn({ err: e?.message }, 'Failed to create story image records'); }
          }
        } catch (e) { logger.warn({ err: e?.message }, 'Failed handling uploaded files'); }
      }
      // reload story including images and user info
      let fullStory = story;
      try { fullStory = await prisma.story.findUnique({ where: { id: story.id }, include: { images: true, user: { select: { id: true, fullName: true, photo: true } } } }); } catch (e) { logger.warn({ err: e?.message }, 'Failed to reload story after image persistence'); }
      // broadcast WS event
      try {
        const { getIO } = await import('../websocket/socket.js');
        getIO().emit('storyCreated', fullStory || story);
      } catch (e) { /* socket not ready - ignore */ }
      return res.apiSuccess(fullStory || story, 'Created', 201);
    } catch (e) {
      logger.error(e);
      return res.apiError(e.status === 403 ? 'Forbidden' : 'Internal Server Error', e.status || 500);
    }
  },

  async list(req, res) {
    try {
      const stories = await storyService.listStories();
      return res.apiSuccess(stories, 'OK', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  }
};

export async function updateStory(req, res) {
  try {
    if (!req.user || !req.user.roles?.includes('ADMIN')) return res.apiError('Forbidden', 403);
    const id = req.params.id;
    const payload = { ...req.body };
    if (typeof payload.images === 'string') { try { payload.images = JSON.parse(payload.images); } catch (e) {} }
    const { error, value } = updateStorySchema.validate(payload);
    if (error) return res.apiError(error.message, 400);
    // Load existing to manage file cleanup if new uploads are provided
    let existing = null;
    try { existing = await prisma.story.findUnique({ where: { id }, include: { images: true } }); } catch {}
  // If files are being uploaded, avoid passing images array to service to prevent double replacement
  const callPayload = (Array.isArray(req.files) && req.files.length && Array.isArray(value.images)) ? (() => { const { images, ...rest } = value; return rest; })() : value;
  const updated = await storyService.updateStory(id, callPayload);
    // If new files uploaded via multipart, replace physical files and DB image records
    if (Array.isArray(req.files) && req.files.length) {
      try {
        // Delete previous files and DB rows
        if (existing && Array.isArray(existing.images)) {
          for (const img of existing.images) {
            try { await storage.deletePath(img.url); } catch {}
          }
          try { await prisma.storyImage.deleteMany({ where: { storyId: id } }); } catch {}
        }
        // Save new files
        const uploadsDir = `uploads/stories/${id}`;
        const urls = [];
        for (let i = 0; i < req.files.length; i++) {
          const f = req.files[i];
          try {
            const dest = await storage.saveTempTo(uploadsDir, f.path, f.originalname || `img_${i}`);
            const url = `/${dest.replace(/\\/g, '/').replace(/^\/?/, '')}`;
            urls.push(url);
          } catch (e) {
            logger.warn({ err: e?.message, file: f.originalname }, 'Failed to persist uploaded story image on update');
          }
        }
        if (urls.length) {
          try { await prisma.storyImage.createMany({ data: urls.map((u, idx) => ({ storyId: id, url: u, position: idx })) }); } catch {}
        }
      } catch (e) {
        logger.warn({ err: e?.message }, 'Failed handling uploaded files for story update');
      }
    }
    // Reload full story entity for consistent response and WS
    let full = updated;
    try { full = await prisma.story.findUnique({ where: { id }, include: { images: true, user: { select: { id: true, fullName: true, photo: true } } } }); } catch {}
    try {
      const { getIO } = await import('../websocket/socket.js');
      getIO().emit('storyUpdated', { id, story: full || updated });
    } catch {}
    return res.apiSuccess(full || updated, 'Updated', 200);
  } catch (e) {
    logger.error(e);
    return res.apiError('Failed', 500);
  }
}

export async function deleteStory(req, res) {
  try {
    if (!req.user || !req.user.roles?.includes('ADMIN')) return res.apiError('Forbidden', 403);
    const id = req.params.id;
    // Delete physical files first (best-effort)
    try {
      const existing = await prisma.story.findUnique({ where: { id }, include: { images: true } });
      if (existing && Array.isArray(existing.images)) {
        for (const img of existing.images) {
          try { await storage.deletePath(img.url); } catch {}
        }
      }
      await storage.deleteDirectory(`uploads/stories/${id}`);
    } catch (e) { logger.warn({ err: e?.message }, 'Failed to delete story files from disk'); }
    await storyService.deleteStory(id);
    try {
      const { getIO } = await import('../websocket/socket.js');
      getIO().emit('storyDeleted', { id });
    } catch {}
    return res.apiSuccess({ id }, 'Deleted', 200);
  } catch (e) {
    logger.error(e);
    return res.apiError('Failed', 500);
  }
}
