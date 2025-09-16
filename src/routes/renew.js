import express from 'express';
import { renewController } from '../controllers/renewController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.post('/issue', requireAuth, renewController.issue);
router.post('/redeem', renewController.redeem);
router.get('/tokens', requireAuth, renewController.listTokens);
router.get('/tokens/:id', requireAuth, renewController.getToken);
router.put('/tokens/:id', requireAuth, renewController.updateToken);
router.patch('/tokens/:id', requireAuth, renewController.patchToken);
router.delete('/tokens/:id', requireAuth, renewController.deleteToken);
export default router;
