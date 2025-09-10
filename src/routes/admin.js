import express from 'express';
import { adminController } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();
router.get('/listings/pending', requireAuth, requireRole(Roles.ADMIN), adminController.pendingListings);
router.post('/listings/:id/reject', requireAuth, requireRole(Roles.ADMIN), adminController.rejectListing);
router.get('/stats', requireAuth, requireRole(Roles.ADMIN), adminController.stats);
export default router;
