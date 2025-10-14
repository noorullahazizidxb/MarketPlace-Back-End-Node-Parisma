import express from 'express';
import multer from 'multer';
import { blogController } from '../controllers/blogController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Public list
router.get('/', blogController.list);
const upload = multer({ dest: 'tmp/uploads' });
// Create (any logged-in) - accepts multipart/form-data (files + fields)
router.post('/', requireAuth, upload.any(), blogController.create);
// Update (author only)
router.put('/:id', requireAuth, blogController.update);
// Comments, likes, shares
router.post('/:id/comments', requireAuth, blogController.comment);
router.post('/:id/likes', requireAuth, blogController.like);
router.post('/:id/shares', requireAuth, blogController.share);

export default router;
