import express from 'express';
import { themeController } from '../controllers/themeController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();

// Public: list and get
router.get('/', themeController.list);
router.get('/:id', themeController.get);

// Admin: create and update
router.post('/', requireAuth, requireRole(Roles.ADMIN), themeController.create);
router.put('/:id', requireAuth, requireRole(Roles.ADMIN), themeController.update);

export default router;
