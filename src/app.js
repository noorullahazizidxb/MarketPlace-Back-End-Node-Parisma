import express from 'express';
import cors from 'cors';
import compression from 'compression';
import bodyParser from 'body-parser';
import path from 'path';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { registerRoutes } from './routes/index.js';
import { attachAuth } from './middleware/auth.js';
import { responseWrapper } from './middleware/responseWrapper.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { createUpload } from './utils/upload.js';

export const upload = createUpload('uploads/');

export const app = express();

app.use(cors());
app.use(compression());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(responseWrapper);
app.use(attachAuth);
app.use('/api', apiRateLimiter);

if (config.storage.driver === 'local') {
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath, { maxAge: '7d', immutable: true }));
}

app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

registerRoutes(app, upload);

app.use((err, req, res, _next) => {
  logger.error(err, 'Unhandled error');
  if (res.headersSent) return _next(err);
  if (res.apiError) return res.apiError(err.message || 'Internal error', err.status || 500);
  return res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});
