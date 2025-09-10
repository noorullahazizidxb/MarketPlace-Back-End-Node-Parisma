import express from 'express';
import { roleController } from '../controllers/roleController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();
router.post('/assign', requireAuth, requireRole(Roles.ADMIN), roleController.assign);
router.get('/user/:userId', requireAuth, requireRole(Roles.ADMIN), roleController.listUserRoles);
export default router;
