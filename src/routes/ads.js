import express from 'express';
import { adController } from '../controllers/adController.js';
import { attachAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();

// Public: list and get
router.get('/', adController.list);
router.get('/:id', adController.get);

// Protected: create/update/delete require ADMIN
router.post('/', attachAuth, requireAuth, requireRole(Roles.ADMIN), adController.create);
router.put('/:id', attachAuth, requireAuth, requireRole(Roles.ADMIN), adController.update);
router.delete('/:id', attachAuth, requireAuth, requireRole(Roles.ADMIN), adController.remove);

export default router;
