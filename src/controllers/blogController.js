import { createBlogSchema, updateBlogSchema, createCommentSchema } from '../validation/blog.js';
import { blogService } from '../services/blogService.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/prisma.js';
import { storage } from '../utils/storage.js';
import { config } from '../config/index.js';

export const blogController = {
  async create(req, res) {
    try {
      if (!req.user) return res.apiError('Unauthorized', 401);
      // Debug: log body and uploaded files to help diagnose multipart issues
      try {
        logger.debug({ contentType: req.headers['content-type'], bodyKeys: Object.keys(req.body || {}), files: (req.files || []).map(f => ({ fieldname: f.fieldname, originalname: f.originalname, size: f.size })) }, 'Blog create payload received');
      } catch (e) {}
      const payload = { ...req.body };
      if (typeof payload.images === 'string') { try { payload.images = JSON.parse(payload.images); } catch (e) {} }
      const { error, value } = createBlogSchema.validate(payload);
      if (error) {
        // In development, include the received body & files to aid debugging
        if (config.env === 'development') {
          logger.warn({ err: error.message, body: req.body, files: req.files }, 'Blog validation failed');
          return res.apiError({ message: error.message, received: { body: req.body, files: (req.files || []).map(f => f.originalname) } }, 400);
        }
        return res.apiError(error.message, 400);
      }
      const blog = await blogService.createBlog(value, req.user.id);
  // debug log for creation
  logger.info({ blogId: blog.id, authorId: req.user.id }, 'Blog created - controller');
      // If files uploaded via multipart, persist them to uploads/blogs/{id} and attach URLs
      if (Array.isArray(req.files) && req.files.length) {
        try {
          const uploadsDir = `uploads/blogs/${blog.id}`;
          const urls = [];
          for (let i = 0; i < req.files.length; i++) {
            const f = req.files[i];
            try {
              const dest = await storage.saveTempTo(uploadsDir, f.path, f.originalname || `img_${i}`);
              const url = `/${dest.replace(/\\/g, '/').replace(/^\/?/, '')}`;
              urls.push(url);
            } catch (e) {
              logger.warn({ err: e?.message, file: f.originalname }, 'Failed to persist uploaded blog image');
            }
          }
          if (urls.length) {
            try { await prisma.blog.update({ where: { id: blog.id }, data: { images: urls } }); } catch (e) { logger.warn({ err: e?.message }, 'Failed to update blog images'); }
          }
        } catch (e) { logger.warn({ err: e?.message }, 'Failed handling uploaded files'); }
      }
      // Reload blog from DB so it includes persisted image URLs and relations
      let fullBlog = null;
      try {
        fullBlog = await blogService.getById(blog.id);
        // Convert any relative image paths to absolute URLs using the request host
        if (fullBlog && Array.isArray(fullBlog.images)) {
          const origin = `${req.protocol}://${req.get('host')}`;
          fullBlog.images = fullBlog.images.map((img) => {
            if (!img) return img;
            if (/^https?:\/\//i.test(img)) return img;
            return img.startsWith('/') ? `${origin}${img}` : `${origin}/${img}`;
          });
        }
      } catch (e) {
        logger.warn({ err: e?.message, blogId: blog.id }, 'Failed to reload blog after image persistence');
      }
      // Emit blogCreated for live updates (best-effort) using fullBlog when available
      try {
        const { getIO } = await import('../websocket/socket.js');
        logger.info({ blogId: blog.id }, 'Emitting blogCreated');
        getIO().emit('blogCreated', fullBlog || blog);
      } catch (e) {
        logger.warn({ err: e?.message }, 'Failed to emit blogCreated');
      }
      // Create a system notification to inform the author their blog was posted
      try {
        const note = await prisma.notification.create({
          data: {
            title: 'Blog published',
            message: `Your blog "${(fullBlog || blog).title}" was published.`,
            channel: 'SYSTEM',
            targetType: 'USER',
            senderId: req.user.id,
            meta: { blogId: blog.id },
            triggerEvent: 'BLOG_CREATED',
            recipients: { create: [{ userId: req.user.id }] }
          }
        });
        try {
          const { emitToUser } = await import('../websocket/socket.js');
          emitToUser(req.user.id, 'notification:new', { type: 'BLOG_CREATED', blogId: blog.id, notificationId: note.id, title: (fullBlog || blog).title });
        } catch (e) {
          // non-fatal if socket not available
        }
      } catch (e) {
        logger.warn({ err: e?.message }, 'Failed to create notification for blog creation');
      }
  // Return the fully reloaded blog when available so clients get the same payload as the WS emit
  return res.apiSuccess(fullBlog || blog, 'Created', 201);
    } catch (e) {
      logger.error(e);
      return res.apiError('Internal Server Error', 500);
    }
  },
  async list(req, res) {
    try {
      const blogs = await blogService.listBlogs();
      return res.apiSuccess(blogs, 'OK', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  },
  async update(req, res) {
    try {
      if (!req.user) return res.apiError('Unauthorized', 401);
      const id = req.params.id;
      const payload = { ...req.body };
      if (typeof payload.images === 'string') { try { payload.images = JSON.parse(payload.images); } catch (e) {} }
      const { error, value } = updateBlogSchema.validate(payload);
      if (error) return res.apiError(error.message, 400);
      const updated = await blogService.updateBlog(id, value, req.user.id);
      // WS broadcast
      try {
        const { getIO } = await import('../websocket/socket.js');
        logger.info({ id }, 'Emitting blogUpdated');
        getIO().emit('blogUpdated', { id, blog: updated });
      } catch (e) { logger.warn({ err: e?.message }, 'Failed to emit blogUpdated'); }
      return res.apiSuccess(updated, 'Updated', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError(e.status === 403 ? 'Forbidden' : (e.message === 'Not found' ? 'Not found' : 'Internal Server Error'), e.status || (e.message === 'Not found' ? 404 : 500));
    }
  },
  async comment(req, res) {
    try {
      if (!req.user) return res.apiError('Unauthorized', 401);
      const id = req.params.id;
      const { error, value } = createCommentSchema.validate(req.body);
      if (error) return res.apiError(error.message, 400);
      const c = await blogService.addComment(id, req.user.id, value.body);
      try {
        const { getIO } = await import('../websocket/socket.js');
        getIO().emit('newComment', { blogId: id, comment: { ...c, author: { id: req.user.id } } });
      } catch (e) {}
      return res.apiSuccess(c, 'Created', 201);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  },
  async like(req, res) {
    try {
      if (!req.user) return res.apiError('Unauthorized', 401);
      const id = req.params.id;
      const b = await blogService.like(id, req.user.id);
      const liked = Array.isArray(b.likedBy) ? b.likedBy.includes(req.user.id) : undefined;
      try {
        const { getIO } = await import('../websocket/socket.js');
        getIO().emit('newLike', { blogId: id, likes: b.likes, liked, userId: req.user.id });
      } catch (e) {}
      return res.apiSuccess({ id: b.id, likes: b.likes, liked }, 'OK', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  },
  async share(req, res) {
    try {
      if (!req.user) return res.apiError('Unauthorized', 401);
      const id = req.params.id;
      const b = await blogService.share(id, req.user.id);
      const shared = Array.isArray(b.sharedBy) ? b.sharedBy.includes(req.user.id) : undefined;
      try {
        const { getIO } = await import('../websocket/socket.js');
        getIO().emit('newShare', { blogId: id, shares: b.shares, shared, userId: req.user.id });
      } catch (e) {}
      return res.apiSuccess({ id: b.id, shares: b.shares, shared }, 'OK', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  }
};
