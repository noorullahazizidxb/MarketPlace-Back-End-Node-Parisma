import express from 'express';
import { storyController, updateStory, deleteStory } from '../controllers/storyController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public list
router.get('/', storyController.list);
// Admin-only create
router.post('/', requireAdmin, storyController.create);
// Admin-only update and delete
router.put('/:id', requireAdmin, updateStory);
router.delete('/:id', requireAdmin, deleteStory);

export default router;
