import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { notificationController } from '../controllers/notificationController.js';

const router = express.Router();
router.post('/', requireAuth, notificationController.send);
export default router;
