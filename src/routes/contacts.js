import express from 'express';
import { contactController } from '../controllers/contactController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Public contact creation
router.post('/', contactController.create);

// Admin-only list & get
router.get('/', requireAuth, contactController.list);
router.get('/:id', requireAuth, contactController.get);

export default router;
