import express from 'express';
import { listingController } from '../controllers/listingController.js';
import multer from 'multer';
import { compressUploads } from '../middleware/compressUploads.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({ dest: 'tmp/uploads' });
// List approved listings (public)
router.get('/', listingController.listApproved);
// List approved listings with hidden seller contact
router.get('/hidden', listingController.listHiddenContact);
// List pending/unapproved listings (admin)
router.get('/pending', requireAuth, listingController.listPending);
// Real-time approvals: broadcast pending listings to admin clients
router.get('/for-approval', requireAuth, listingController.forApproval);
// Force emit all pending listings to admin sockets (admin only)
router.post('/for-approval/emit-all', requireAuth, listingController.emitAllForApproval);
// Create a listing (user) - accept multipart/form-data (files + fields)
router.post('/', requireAuth, upload.any(), compressUploads, listingController.create);

// Get listing
router.get('/:id', listingController.get);

// Full update and partial update (authenticated users)
router.put('/:id', requireAuth, upload.any(), compressUploads, listingController.update);
router.patch('/:id', requireAuth, upload.any(), compressUploads, listingController.patch);

// Update contact visibility and bind representatives by location when hiding seller
router.post('/:id', requireAuth, listingController.updateVisibilityAndBindReps);

// Admin approval (still requires authentication; role checks handled in controller/service if needed)
router.post('/:id/approve', requireAuth, listingController.approve);
// Admin reject
router.post('/:id/reject', requireAuth, listingController.reject);
// Delete a listing (owner or admin) - removes DB record and uploaded files
router.delete('/:id', requireAuth, listingController.delete);

export default router;
