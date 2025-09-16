import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { userController } from '../controllers/userController.js';

const router = express.Router();
const upload = multer({ dest: 'tmp/uploads' });
router.get('/', userController.list);
router.get('/:id', userController.get);
// Return listings for the current authenticated user
import { listingController } from '../controllers/listingController.js';
router.get('/me/listings', requireAuth, listingController.listByUser);
router.post('/me/photo', requireAuth, upload.single('photo'), userController.uploadPhoto);
router.put('/me', requireAuth, userController.updateProfile);
router.put('/:id', requireAuth, userController.updateById);
router.patch('/:id', requireAuth, userController.patchById);
export default router;
