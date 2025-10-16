import express from 'express';
import { storyController, updateStory, deleteStory } from '../controllers/storyController.js';
import multer from 'multer';
import { compressUploads } from '../middleware/compressUploads.js';

const upload = multer({ dest: 'tmp/uploads' });
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public list
router.get('/', storyController.list);
// Admin-only create
router.post('/', requireAdmin, upload.any(), compressUploads, storyController.create);
// Admin-only update and delete
router.put('/:id', requireAdmin, upload.any(), compressUploads, updateStory);
router.delete('/:id', requireAdmin, deleteStory);

export default router;
