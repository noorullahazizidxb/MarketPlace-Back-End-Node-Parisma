import express from 'express';
import { listingController } from '../controllers/listingController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();

// Create a listing (user)
router.post('/', requireAuth, listingController.create);

// Get listing
router.get('/:id', listingController.get);

// Admin approval
router.post('/:id/approve', requireAuth, requireRole(Roles.ADMIN), listingController.approve);

export default router;
