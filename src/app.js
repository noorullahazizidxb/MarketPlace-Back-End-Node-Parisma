import express from 'express';
import cors from 'cors';
import compression from 'compression';
import bodyParser from 'body-parser';
import { logger } from './utils/logger.js';
import { registerRoutes } from './routes/index.js';
import { attachAuth } from './middleware/auth.js';
import { responseWrapper, errorHandler } from './middleware/responseWrapper.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { corsOrigins, isVercel, runtimeSummary } from './lib/runtime.js';
import { uploadsRoot } from './lib/upload.js';
import { prisma } from './config/prisma.js';
import maintenanceRouter from './routes/maintenance.js';

const app = express();

if (isVercel) {
  app.set('trust proxy', 1);
}

app.use(cors({ origin: corsOrigins(), credentials: true }));
app.use(compression());
app.use(bodyParser.json({ limit: process.env.JSON_LIMIT || '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(responseWrapper);
app.use(attachAuth);
app.use('/api', apiRateLimiter);

app.use('/uploads', express.static(uploadsRoot(), { maxAge: '7d', immutable: true }));

app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (res.apiSuccess) return res.apiSuccess({ ok: true, db: 'ok', runtime: runtimeSummary() }, 'OK', 200);
    return res.json({ ok: true, db: 'ok', runtime: runtimeSummary() });
  } catch {
    return res.status(503).json({ ok: false, db: 'down', runtime: runtimeSummary() });
  }
});

registerRoutes(app);
app.use('/api/maintenance', maintenanceRouter);

app.use(errorHandler);

export default app;
