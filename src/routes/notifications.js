import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { notificationController } from '../controllers/notificationController.js';

const router = express.Router();
router.post('/', requireAuth, notificationController.send);
router.get('/', notificationController.list);
// Specific routes must come before dynamic :id to avoid shadowing
router.patch('/mark-all-read', requireAuth, notificationController.markAllRead);
router.patch('/:id/read', requireAuth, notificationController.markRead);
router.get('/:id', notificationController.get);
router.patch('/:id', requireAuth, notificationController.patch);
export default router;
