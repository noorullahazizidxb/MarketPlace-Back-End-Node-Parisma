import express from 'express';
import { storyController, updateStory, deleteStory } from '../controllers/storyController.js';
import multer from 'multer';

const upload = multer({ dest: 'tmp/uploads' });
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public list
router.get('/', storyController.list);
// Admin-only create
router.post('/', requireAdmin, upload.any(), storyController.create);
// Admin-only update and delete
router.put('/:id', requireAdmin, updateStory);
router.delete('/:id', requireAdmin, deleteStory);

export default router;
