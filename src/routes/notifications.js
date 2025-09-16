import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { notificationController } from '../controllers/notificationController.js';

const router = express.Router();
router.post('/', requireAuth, notificationController.send);
router.get('/', notificationController.list);
router.get('/:id', notificationController.get);
router.patch('/:id', requireAuth, notificationController.patch);
export default router;
