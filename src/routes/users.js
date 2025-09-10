import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { userController } from '../controllers/userController.js';

const router = express.Router();
const upload = multer({ dest: 'tmp/uploads' });
router.get('/', userController.list);
router.post('/me/photo', requireAuth, upload.single('photo'), userController.uploadPhoto);
router.put('/me', requireAuth, userController.updateProfile);
export default router;
