import express from 'express';
import { listingController } from '../controllers/listingController.js';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();

const upload = multer({ dest: 'tmp/uploads' });
// List approved listings (public)
router.get('/', listingController.listApproved);
// List pending/unapproved listings (admin)
router.get('/pending', requireAuth, requireRole(Roles.ADMIN), listingController.listPending);
// Create a listing (user) - accept multipart/form-data (files + fields)
router.post('/', requireAuth, upload.any(), listingController.create);

// Get listing
router.get('/:id', listingController.get);

// Admin approval
router.post('/:id/approve', requireAuth, requireRole(Roles.ADMIN), listingController.approve);

export default router;
