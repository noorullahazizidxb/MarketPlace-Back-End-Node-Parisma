import express from 'express';
import { renewController } from '../controllers/renewController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.post('/issue', requireAuth, renewController.issue);
router.post('/redeem', renewController.redeem);
export default router;
