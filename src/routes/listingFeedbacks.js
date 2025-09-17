import express from 'express';
import { listingFeedbackController } from '../controllers/listingFeedbackController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Create a feedback (authenticated)
router.post('/', requireAuth, listingFeedbackController.create);

// List feedbacks for a specific listing
router.get('/listing/:listingId', listingFeedbackController.listByListing);

// Get specific feedback
router.get('/:id', listingFeedbackController.get);

// Delete feedback (owner or admin)
router.delete('/:id', requireAuth, listingFeedbackController.remove);

export default router;
