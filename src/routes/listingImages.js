import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listingController } from '../controllers/listingController.js';
import { compressUploads } from '../middleware/compressUploads.js';
import { createUpload } from '../lib/upload.js';

const router = express.Router();
const upload = createUpload();

router.post('/:id/images', requireAuth, upload.single('image'), compressUploads, listingController.uploadImage);
router.get('/:id/images', listingController.getImages);

export default router;
