import express from 'express';
import { authController } from '../controllers/authController.js';
import { attachAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { Roles } from '../constants/enums.js';
import { createUpload } from '../lib/upload.js';
import { loginRateLimiter, refreshRateLimiter, strictLimiter } from '../middleware/rateLimit.js';

const router = express.Router();
const upload = createUpload();

// role-specific public endpoints
// accept any file field (normalised in controller) to be tolerant to client field name differences
router.post('/user/register', strictLimiter, upload.any(), authController.registerUser);
// Representative registration (public)
router.post('/representative/register', strictLimiter, upload.any(), authController.registerRepresentative);
// Admin-only account creation (any role via `role` field; defaults to ADMIN for backward compatibility)
router.post('/admin/register', attachAuth, requireAuth, requireRole(Roles.ADMIN), upload.any(), authController.registerAdmin);

router.post('/login', loginRateLimiter, authController.login);
// Rotating refresh tokens
router.post('/refresh', refreshRateLimiter, authController.refresh);
// Sign-out: revokes the refresh-token family (idempotent; works with or without a valid access token)
router.post('/logout', attachAuth, authController.logout);
router.post('/social/google', loginRateLimiter, authController.googleSocialLogin);
router.post('/social/facebook', loginRateLimiter, authController.facebookSocialLogin);
// returns full authenticated user profile and related data
router.get('/profile', attachAuth, requireAuth, authController.profile);
export default router;
