import express from 'express';
import multer from 'multer';
import { blogController } from '../controllers/blogController.js';
import { requireAuth } from '../middleware/auth.js';
import { compressUploads } from '../middleware/compressUploads.js';

const router = express.Router();

// Public list
router.get('/', blogController.list);
const upload = multer({ dest: 'tmp/uploads' });
// Create (any logged-in) - accepts multipart/form-data (files + fields)
router.post('/', requireAuth, upload.any(), compressUploads, blogController.create);
// Update (author only)
// Update accepts multipart (files) or JSON; supports PATCH semantics via PUT
router.put('/:id', requireAuth, upload.any(), compressUploads, blogController.update);
router.delete('/:id', requireAuth, blogController.delete);
// Comments, likes, shares
router.post('/:id/comments', requireAuth, blogController.comment);
router.post('/:id/likes', requireAuth, blogController.like);
router.post('/:id/shares', requireAuth, blogController.share);

export default router;
