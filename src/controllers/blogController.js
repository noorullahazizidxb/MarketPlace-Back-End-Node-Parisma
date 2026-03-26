import { createBlogSchema, updateBlogSchema, createCommentSchema } from '../validation/blog.js';
import { blogService } from '../services/blogService.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/prisma.js';
import { storage } from '../utils/storage.js';
import { config } from '../config/index.js';
import { indexBlog, removeBlogFromIndex } from '../search/elasticsearch.js';

export const blogController = {
  async create(req, res) {
    try {
      if (!req.user) return res.apiError('Unauthorized', 401);
      // Debug: log body and uploaded files to help diagnose multipart issues
      try {
        logger.debug({ contentType: req.headers['content-type'], bodyKeys: Object.keys(req.body || {}), files: (req.files || []).map(f => ({ fieldname: f.fieldname, originalname: f.originalname, size: f.size })) }, 'Blog create payload received');
      } catch (e) { }
      const payload = { ...req.body };
      if (typeof payload.images === 'string') { try { payload.images = JSON.parse(payload.images); } catch (e) { } }
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
      // Emit blogCreated for general live updates (best-effort)
      try {
        const { getIO } = await import('../websocket/socket.js');
        logger.info({ blogId: blog.id }, 'Emitting blogCreated');
        getIO().emit('blogCreated', fullBlog || blog);
      } catch (e) {
        logger.warn({ err: e?.message }, 'Failed to emit blogCreated');
      }
      // Emit pending-blog:new to the admin approvals room so admins see it immediately
      try {
        const { emitToApprovals } = await import('../websocket/socket.js');
        emitToApprovals('pending-blog:new', fullBlog || blog);
        logger.info({ blogId: blog.id }, 'Emitted pending-blog:new to approvals room');
      } catch (e) {
        logger.warn({ err: e?.message }, 'Failed to emit pending-blog:new');
      }
      // Create a system notification to inform the author their blog is pending review
      try {
        const note = await prisma.notification.create({
          data: {
            title: 'Blog submitted for review',
            message: `Your blog "${(fullBlog || blog).title}" was submitted and is pending admin review.`,
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
      if (config.elastic.enabled && fullBlog) {
        try {
          await indexBlog(fullBlog);
        } catch (e) {
          logger.warn({ err: e?.message, blogId: blog.id }, 'Failed to index blog after creation');
        }
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
      const blogs = await blogService.listBlogs(req.query.q);
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
      if (typeof payload.images === 'string') { try { payload.images = JSON.parse(payload.images); } catch (e) { } }
      const { error, value } = updateBlogSchema.validate(payload);
      if (error) return res.apiError(error.message, 400);
      // load existing to get previous images
      const existing = await blogService.getById(id);
      if (!existing) return res.apiError('Not found', 404);
      // enforce author ownership
      if (existing.author.id !== req.user.id && !(req.user.roles || []).includes('ADMIN')) return res.apiError('Forbidden', 403);
      // update textual fields first
      const updated = await blogService.updateBlog(id, value, req.user.id);
      // If files uploaded, replace old files with new ones
      if (Array.isArray(req.files) && req.files.length) {
        try {
          // remove old files if any
          const oldImages = Array.isArray(existing.images) ? existing.images : [];
          for (const img of oldImages) {
            try { await storage.deletePath(img); } catch (e) { logger.warn({ err: e?.message, img }, 'Failed to delete old blog image'); }
          }
          // save new files
          const uploadsDir = `uploads/blogs/${id}`;
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
            try { await prisma.blog.update({ where: { id }, data: { images: urls } }); } catch (e) { logger.warn({ err: e?.message }, 'Failed to update blog images after upload'); }
          }
        } catch (e) { logger.warn({ err: e?.message }, 'Failed handling uploaded files for blog update'); }
      }
      // reload full blog
      let fullBlog = null;
      try { fullBlog = await blogService.getById(id); } catch (e) { logger.warn({ err: e?.message }, 'Failed to reload blog after update'); }
      // WS broadcast
      try {
        const { getIO } = await import('../websocket/socket.js');
        logger.info({ id }, 'Emitting blogUpdated');
        getIO().emit('blogUpdated', { id, blog: fullBlog || updated });
      } catch (e) { logger.warn({ err: e?.message }, 'Failed to emit blogUpdated'); }
      if (config.elastic.enabled && fullBlog) {
        try {
          await indexBlog(fullBlog);
        } catch (e) {
          logger.warn({ err: e?.message, blogId: id }, 'Failed to reindex updated blog');
        }
      }
      return res.apiSuccess(fullBlog || updated, 'Updated', 200);
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
      // reload comment to include author details (fullName, photo)
      let fullComment = null;
      try {
        fullComment = await prisma.blogComment.findUnique({ where: { id: c.id }, include: { author: { select: { id: true, fullName: true, photo: true } } } });
      } catch (e) {
        logger.warn({ err: e?.message }, 'Failed to reload comment with author');
      }
      try {
        const { getIO } = await import('../websocket/socket.js');
        getIO().emit('newComment', { blogId: id, comment: fullComment || { ...c, author: { id: req.user.id } } });
      } catch (e) { }
      return res.apiSuccess(fullComment || c, 'Created', 201);
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
      } catch (e) { }
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
      } catch (e) { }
      return res.apiSuccess({ id: b.id, shares: b.shares, shared }, 'OK', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  }
  ,
  async delete(req, res) {
    try {
      if (!req.user) return res.apiError('Unauthorized', 401);
      const id = req.params.id;
      const existing = await blogService.getById(id);
      if (!existing) return res.apiError('Not found', 404);
      // only author or admin can delete
      if (existing.author.id !== req.user.id && !(req.user.roles || []).includes('ADMIN')) return res.apiError('Forbidden', 403);
      // delete files folder
      try {
        await storage.deleteDirectory(`uploads/blogs/${id}`);
        if (Array.isArray(existing.images)) {
          for (const img of existing.images) {
            try { await storage.deletePath(img); } catch (e) { }
          }
        }
      } catch (e) { logger.warn({ err: e?.message }, 'Failed to delete blog files'); }
      // delete DB row
      await blogService.deleteBlog(id);
      if (config.elastic.enabled) {
        try {
          await removeBlogFromIndex(id);
        } catch (e) {
          logger.warn({ err: e?.message, blogId: id }, 'Failed to remove blog from index after delete');
        }
      }
      try {
        const { getIO } = await import('../websocket/socket.js');
        getIO().emit('blogDeleted', { id });
      } catch (e) { }
      return res.apiSuccess({ id }, 'Deleted', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  },

  async listPending(req, res) {
    try {
      if (!req.user || !(req.user.roles || []).includes('ADMIN')) return res.apiError('Forbidden', 403);
      const blogs = await blogService.listPendingBlogs();
      return res.apiSuccess(blogs, 'OK', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  },

  async emitAllPendingBlogs(req, res) {
    try {
      if (!req.user || !(req.user.roles || []).includes('ADMIN')) return res.apiError('Forbidden', 403);
      const blogs = await blogService.listPendingBlogs();
      try {
        const { emitToApprovals } = await import('../websocket/socket.js');
        emitToApprovals('pending-blogs', blogs);
      } catch (e) { }
      return res.apiSuccess({ emitted: blogs.length }, 'Emitted', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  },

  async approve(req, res) {
    try {
      if (!req.user || !(req.user.roles || []).includes('ADMIN')) return res.apiError('Forbidden', 403);
      const id = req.params.id;
      const blog = await blogService.approveBlog(id);
      // Notify the author
      try {
        const { emitToUser } = await import('../websocket/socket.js');
        emitToUser(blog.authorId, 'notification:new', { type: 'BLOG_APPROVED', blogId: id, title: blog.title });
        await prisma.notification.create({
          data: {
            title: 'Blog approved',
            message: `Your blog "${blog.title}" was approved and is now live.`,
            channel: 'SYSTEM',
            targetType: 'USER',
            triggerEvent: 'BLOG_APPROVED',
            recipients: { create: [{ userId: blog.authorId }] }
          }
        });
      } catch (e) { logger.warn({ err: e?.message }, 'Failed to notify author on blog approval'); }
      // Broadcast updated blog so public lists refresh
      try {
        const { getIO } = await import('../websocket/socket.js');
        getIO().emit('blogUpdated', { blog });
      } catch (e) { }
      return res.apiSuccess(blog, 'Approved', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError(e.message === 'Not found' ? 'Not found' : 'Failed', e.message === 'Not found' ? 404 : 500);
    }
  },

  async reject(req, res) {
    try {
      if (!req.user || !(req.user.roles || []).includes('ADMIN')) return res.apiError('Forbidden', 403);
      const id = req.params.id;
      const blog = await blogService.rejectBlog(id);
      // Notify the author
      try {
        const { emitToUser } = await import('../websocket/socket.js');
        emitToUser(blog.authorId, 'notification:new', { type: 'BLOG_REJECTED', blogId: id, title: blog.title });
        await prisma.notification.create({
          data: {
            title: 'Blog rejected',
            message: `Your blog "${blog.title}" was rejected by an admin.`,
            channel: 'SYSTEM',
            targetType: 'USER',
            triggerEvent: 'BLOG_REJECTED',
            recipients: { create: [{ userId: blog.authorId }] }
          }
        });
      } catch (e) { logger.warn({ err: e?.message }, 'Failed to notify author on blog rejection'); }
      return res.apiSuccess({ id }, 'Rejected', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError(e.message === 'Not found' ? 'Not found' : 'Failed', e.message === 'Not found' ? 404 : 500);
    }
  },

  async renew(req, res) {
    try {
      if (!req.user) return res.apiError('Unauthorized', 401);
      const id = req.params.id;
      const blog = await blogService.renewBlog(id, req.user.id);
      return res.apiSuccess(blog, 'Renewed', 200);
    } catch (e) {
      logger.error(e);
      const status = e.status || (e.message === 'Not found' ? 404 : e.message === 'Forbidden' ? 403 : 500);
      return res.apiError(e.message || 'Failed', status);
    }
  },

  async get(req, res) {
    try {
      const blog = await blogService.getById(req.params.id);
      if (!blog) return res.apiError('Not found', 404);
      return res.apiSuccess(blog, 'OK', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  },

  async listAll(req, res) {
    try {
      if (!req.user || !(req.user.roles || []).includes('ADMIN')) return res.apiError('Forbidden', 403);
      const status = req.query.status || undefined;
      const q = String(req.query.q || '').trim();
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const blogs = await blogService.listAll({ status, q, page, limit });
      return res.apiSuccess(blogs, 'OK', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  }
};
