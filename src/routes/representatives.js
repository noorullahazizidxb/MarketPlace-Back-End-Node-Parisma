import express from 'express';
import { representativeController } from '../controllers/representativeController.js';
import { attachAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.post('/', requireAuth, representativeController.create);
router.post('/bind', attachAuth, requireAuth, representativeController.bind);
router.get('/', representativeController.listByRegion);
router.get('/:id', representativeController.get);
router.put('/:id', requireAuth, representativeController.update);
router.patch('/:id', requireAuth, representativeController.patch);

export default router;
