import express from 'express';
import { listingController } from '../controllers/listingController.js';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({ dest: 'tmp/uploads' });
// List approved listings (public)
router.get('/', listingController.listApproved);
// List pending/unapproved listings (admin)
router.get('/pending', requireAuth, listingController.listPending);
// Create a listing (user) - accept multipart/form-data (files + fields)
router.post('/', requireAuth, upload.any(), listingController.create);

// Get listing
router.get('/:id', listingController.get);

// Full update and partial update (authenticated users)
router.put('/:id', requireAuth, listingController.update);
router.patch('/:id', requireAuth, listingController.patch);

// Admin approval (still requires authentication; role checks handled in controller/service if needed)
router.post('/:id/approve', requireAuth, listingController.approve);

export default router;
