import express from 'express';
import { Roles } from '../constants/enums.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uiContextController } from '../controllers/uiContextController.js';

const router = express.Router();

router.get('/', uiContextController.get);
router.patch(
  '/',
  requireAuth,
  requireRole(Roles.ADMIN),
  uiContextController.update,
);

export default router;
