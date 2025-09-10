import express from 'express';
import { listingController } from '../controllers/listingController.js';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();

const upload = multer({ dest: 'tmp/uploads' });
// Create a listing (user) - accept multipart/form-data (files + fields)
router.post('/', requireAuth, upload.any(), listingController.create);

// Get listing
router.get('/:id', listingController.get);

// Admin approval
router.post('/:id/approve', requireAuth, requireRole(Roles.ADMIN), listingController.approve);

export default router;
