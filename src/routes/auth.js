import express from 'express';
import multer from 'multer';
import { authController } from '../controllers/authController.js';
import { attachAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();
const upload = multer({ dest: 'tmp/uploads' });

// role-specific public endpoints
// accept any file field (normalised in controller) to be tolerant to client field name differences
router.post('/user/register', upload.any(), authController.registerUser);
// Representative registration (public)
router.post('/representative/register', upload.any(), authController.registerRepresentative);
// Admin registration - protected: must be an existing ADMIN
router.post('/admin/register', attachAuth, requireAuth, requireRole(Roles.ADMIN), upload.any(), authController.registerAdmin);

router.post('/login', authController.login);
router.post('/social/google', authController.googleSocialLogin);
router.post('/social/facebook', authController.facebookSocialLogin);
// returns full authenticated user profile and related data
router.get('/profile', attachAuth, requireAuth, authController.profile);
export default router;
