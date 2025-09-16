import express from 'express';
import { roleController } from '../controllers/roleController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();
router.post('/assign', requireAuth, requireRole(Roles.ADMIN), roleController.assign);
router.get('/user/:userId', requireAuth, requireRole(Roles.ADMIN), roleController.listUserRoles);
router.get('/', requireAuth, requireRole(Roles.ADMIN), roleController.listAll);
router.get('/:id', requireAuth, requireRole(Roles.ADMIN), roleController.get);
router.put('/:id', requireAuth, requireRole(Roles.ADMIN), roleController.update);
router.patch('/:id', requireAuth, requireRole(Roles.ADMIN), roleController.patch);
router.delete('/:id', requireAuth, requireRole(Roles.ADMIN), roleController.remove);
export default router;
