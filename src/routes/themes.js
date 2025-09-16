import express from 'express';
import { themeController } from '../controllers/themeController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();

// Require admin for all theme actions (entity should only be accessible to admins)
router.get('/', themeController.list);
router.get('/:id', requireAuth, requireRole(Roles.ADMIN), themeController.get);

// Admin: create and update
router.post('/', requireAuth, requireRole(Roles.ADMIN), themeController.create);
router.put('/:id', requireAuth, requireRole(Roles.ADMIN), themeController.update);
router.patch('/:id', requireAuth, requireRole(Roles.ADMIN), themeController.update);
// Admin: update tokens for default theme (id = 1)
router.put('/', requireAuth, requireRole(Roles.ADMIN), themeController.updateDefaultTokens);

export default router;
