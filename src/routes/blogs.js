import express from 'express';
import multer from 'multer';
import { blogController } from '../controllers/blogController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { compressUploads } from '../middleware/compressUploads.js';

const router = express.Router();
const upload = multer({ dest: 'tmp/uploads' });

// Public list (only APPROVED blogs)
router.get('/', blogController.list);

// Admin: list pending blogs
router.get('/pending', requireAuth, requireAdmin, blogController.listPending);

// Admin: all blogs with optional ?status= filter
router.get('/admin/all', requireAuth, requireAdmin, blogController.listAll);

// Admin: force emit all pending blogs to approvals room
router.post('/pending/emit-all', requireAuth, requireAdmin, blogController.emitAllPendingBlogs);

// Create (any logged-in) - accepts multipart/form-data (files + fields)
router.post('/', requireAuth, upload.any(), compressUploads, blogController.create);

// Get single blog by id (public)
router.get('/:id', blogController.get);

// Update (author only) - accepts multipart or JSON
router.put('/:id', requireAuth, upload.any(), compressUploads, blogController.update);
router.delete('/:id', requireAuth, blogController.delete);

// Author: renew a blog (extends expiresAt by BLOG_DEFAULT_EXPIRY_DAYS)
router.post('/:id/renew', requireAuth, blogController.renew);

// Admin moderation: approve / reject a blog
router.post('/:id/approve', requireAuth, requireAdmin, blogController.approve);
router.post('/:id/reject', requireAuth, requireAdmin, blogController.reject);

// Comments, likes, shares
router.post('/:id/comments', requireAuth, blogController.comment);
router.post('/:id/likes', requireAuth, blogController.like);
router.post('/:id/shares', requireAuth, blogController.share);

export default router;
