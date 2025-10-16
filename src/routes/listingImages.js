import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import { listingController } from '../controllers/listingController.js';
import { compressUploads } from '../middleware/compressUploads.js';

const router = express.Router();
const upload = multer({ dest: 'tmp/uploads' });

router.post('/:id/images', requireAuth, upload.single('image'), compressUploads, listingController.uploadImage);
router.get('/:id/images', listingController.getImages);

export default router;
