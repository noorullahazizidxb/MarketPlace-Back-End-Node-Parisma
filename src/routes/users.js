import express from 'express';
import multer from 'multer';
import { attachAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';
import { userController } from '../controllers/userController.js';
import { compressUploads } from '../middleware/compressUploads.js';

const router = express.Router();
const upload = multer({ dest: 'tmp/uploads' });
router.get('/', attachAuth, requireAuth, requireRole(Roles.ADMIN), userController.list);
// Follow a user (push the requesting user's id into the target user's followers array)
router.get('/:id/follow', requireAuth, userController.follow);
router.get('/:id', userController.get);
// Return listings for the current authenticated user
import { listingController } from '../controllers/listingController.js';
router.get('/me/listings', requireAuth, listingController.listByUser);
router.post('/me/photo', requireAuth, upload.single('photo'), compressUploads, userController.uploadPhoto);
router.put('/me', requireAuth, userController.updateProfile);
router.put('/:id', requireAuth, userController.updateById);
router.patch('/:id', requireAuth, userController.patchById);
export default router;
