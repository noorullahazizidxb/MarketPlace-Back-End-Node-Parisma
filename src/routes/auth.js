import express from 'express';
import { authController } from '../controllers/authController.js';
import { attachAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';

const router = express.Router();

// role-specific public endpoints
router.post('/user/register', authController.registerUser);
// Representative registration (public)
router.post('/representative/register', authController.registerRepresentative);
// Admin registration - protected: must be an existing ADMIN
router.post('/admin/register', attachAuth, requireAuth, requireRole(Roles.ADMIN), authController.registerAdmin);

router.post('/login', authController.login);
export default router;
