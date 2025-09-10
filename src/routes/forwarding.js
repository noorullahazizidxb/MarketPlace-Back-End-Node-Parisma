import express from 'express';
import { forwardController } from '../controllers/forwardController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.post('/', requireAuth, forwardController.forward);
router.get('/', requireAuth, forwardController.listAll);
export default router;
