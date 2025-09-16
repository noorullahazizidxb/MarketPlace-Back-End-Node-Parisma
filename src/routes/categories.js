import express from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.get('/', categoryController.list);
router.get('/:id', categoryController.get);
router.post('/', requireAuth, categoryController.create);
router.put('/:id', requireAuth, categoryController.update);
router.patch('/:id', requireAuth, categoryController.patch);
export default router;
