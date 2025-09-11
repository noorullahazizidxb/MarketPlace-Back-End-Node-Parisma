import express from 'express';
import listingsRouter from './listings.js';
import categoriesRouter from './categories.js';
import representativesRouter from './representatives.js';
import authRouter from './auth.js';
import notificationsRouter from './notifications.js';
import searchRouter from './search.js';
import forwardingRouter from './forwarding.js';
import renewRouter from './renew.js';
import rolesRouter from './roles.js';
import adminRouter from './admin.js';
import listingImagesRouter from './listingImages.js';
import userRouter from './users.js';
import themesRouter from './themes.js';

export function registerRoutes(app, upload) {
  const api = express.Router();
  api.get('/health', (req, res) => res.apiSuccess({ ok: true }, 'OK', 200));

  // Listings (create/get/approve...)
  api.use('/listings', (req, res, next) => { res.locals.entityName = 'Listing'; next(); }, listingsRouter);
  api.use('/categories', (req, res, next) => { res.locals.entityName = 'Category'; next(); }, categoriesRouter);
  api.use('/representatives', (req, res, next) => { res.locals.entityName = 'RepresentativeInfo'; next(); }, representativesRouter);
  api.use('/auth', (req, res, next) => { res.locals.entityName = 'Auth'; next(); }, authRouter);
  api.use('/notifications', (req, res, next) => { res.locals.entityName = 'Notification'; next(); }, notificationsRouter);
  api.use('/search', (req, res, next) => { res.locals.entityName = 'Search'; next(); }, searchRouter);
  api.use('/forward', (req, res, next) => { res.locals.entityName = 'Forward'; next(); }, forwardingRouter);
  api.use('/renew', (req, res, next) => { res.locals.entityName = 'Renew'; next(); }, renewRouter);
  api.use('/roles', (req, res, next) => { res.locals.entityName = 'Role'; next(); }, rolesRouter);
  api.use('/admin', (req, res, next) => { res.locals.entityName = 'Admin'; next(); }, adminRouter);
  api.use('/listings', (req, res, next) => { res.locals.entityName = 'ListingImages'; next(); }, listingImagesRouter);
  api.use('/users', (req, res, next) => { res.locals.entityName = 'User'; next(); }, userRouter);
  api.use('/themes', (req, res, next) => { res.locals.entityName = 'Themes'; next(); }, themesRouter);

  app.use('/api', api);
}
