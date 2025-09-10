import express from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();
router.get('/', categoryController.list);
router.post('/', requireAuth, requireRole(Roles.ADMIN), categoryController.create);
export default router;
