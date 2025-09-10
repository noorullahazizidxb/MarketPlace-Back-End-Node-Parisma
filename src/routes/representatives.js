import express from 'express';
import { representativeController } from '../controllers/representativeController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.post('/', requireAuth, representativeController.create);
router.get('/', representativeController.listByRegion);

export default router;
