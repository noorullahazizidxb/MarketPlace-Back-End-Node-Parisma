import express from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();
router.get('/', categoryController.list);
router.get('/:id', categoryController.get);
router.post('/', requireAuth, requireRole(Roles.ADMIN), categoryController.create);
router.put('/:id', requireAuth, categoryController.update);
router.patch('/:id', requireAuth, categoryController.patch);
export default router;
