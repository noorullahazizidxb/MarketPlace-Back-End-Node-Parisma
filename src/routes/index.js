import express from 'express';
import listingsRouter from './listings.js';
import categoriesRouter from './categories.js';
import representativesRouter from './representatives.js';
import authRouter from './auth.js';
import searchRouter from './search.js';
import renewRouter from './renew.js';
import rolesRouter from './roles.js';
import adminRouter from './admin.js';
import listingImagesRouter from './listingImages.js';
import userRouter from './users.js';
import notificationsRouter from './notifications.js';
import listingFeedbacksRouter from './listingFeedbacks.js';
import adsRouter from './ads.js';
import storiesRouter from './stories.js';
import blogsRouter from './blogs.js';
import contactsRouter from './contacts.js';
import publicRouter from './public.js';
import uiContextRouter from './uiContext.js';
import { runtimeSummary } from '../lib/runtime.js';
import { forEntity } from '../middleware/responseWrapper.js';

export function registerRoutes(app) {
  const api = express.Router();
  api.get('/health', (req, res) => res.apiSuccess({ ok: true, runtime: runtimeSummary() }, 'Service is healthy', 200));
  api.use('/public', forEntity('Public'), publicRouter);
  api.use('/ui-context', forEntity('UiContext'), uiContextRouter);

  // Listings (create/get/approve...)
  api.use('/listings', forEntity('Listing'), listingsRouter);
  api.use('/categories', forEntity('Category'), categoriesRouter);
  api.use('/representatives', forEntity('RepresentativeInfo'), representativesRouter);
  api.use('/auth', forEntity('Auth'), authRouter);
  api.use('/notifications', forEntity('Notification'), notificationsRouter);
  // also support singular `/notification` for clients hitting that path
  api.use('/notification', forEntity('Notification'), notificationsRouter);
  api.use('/search', forEntity('Search'), searchRouter);
  // forwarding feature removed - no longer registering /forward routes
  api.use('/renew', forEntity('Renew'), renewRouter);
  api.use('/roles', forEntity('Role'), rolesRouter);
  api.use('/admin', forEntity('Admin'), adminRouter);
  api.use('/listings', forEntity('ListingImages'), listingImagesRouter);
  api.use('/users', forEntity('User'), userRouter);
  api.use('/feedbacks', forEntity('ListingFeedback'), listingFeedbacksRouter);
  api.use('/ads', forEntity('Ad'), adsRouter);
  api.use('/stories', forEntity('Story'), storiesRouter);
  api.use('/blogs', forEntity('Blog'), blogsRouter);
  api.use('/contacts', forEntity('Contact'), contactsRouter);

  app.use('/api', api);
}
