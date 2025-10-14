import express from 'express';
import cors from 'cors';
import compression from 'compression';
import bodyParser from 'body-parser';
import multer from 'multer';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { registerRoutes } from './routes/index.js';
import { attachAuth } from './middleware/auth.js';
import { responseWrapper } from './middleware/responseWrapper.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import path from 'path';
import { initQueues } from './jobs/queues.js';
import { initSearch } from './search/elasticsearch.js';
import { scheduleRecurringJobs } from './schedulers/cron.js';

// import workers so they are instantiated
import './workers/searchWorker.js';
import './workers/moderationWorker.js';
import './workers/notificationWorker.js';
import './workers/renewalReminderWorker.js';
import './workers/contentCleanupWorker.js';

const app = express();
import http from 'http';
import { initWebsockets } from './websocket/socket.js';
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(compression());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// attach JWT auth parsing middleware
// standardized response helpers (must be before auth so auth can use res.apiError)
app.use(responseWrapper);

// attach JWT auth parsing middleware
app.use(attachAuth);

// apply basic rate limiting to all API routes
app.use('/api', apiRateLimiter);

// serve uploads with caching headers
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath, { maxAge: '7d', immutable: true }));

// Simple request logger
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

registerRoutes(app, upload);

app.use((err, req, res, next) => {
  logger.error(err, 'Unhandled error');
  if (res.apiError) return res.apiError(err.message || 'Internal error', err.status || 500);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

async function start() {
  try {
    await initSearch();
  } catch (e) {
    logger.warn(e, 'Elasticsearch init failed - continuing without search (make sure ES is running)');
  }
  await initQueues();
  // Log retention/cleanup and reminder days on startup
  try {
    const r = config.retention || {};
  const s = config.schedules || {};
  logger.info({ retention: r, schedules: s }, 'Retention and scheduled job times (days / HH:mm)');
  } catch (e) {
    logger.warn(e, 'Failed to log retention configuration');
  }
  // schedule recurring jobs (creates repeatable jobs)
  try {
    await scheduleRecurringJobs();
  } catch (e) {
    logger.warn(e, 'Failed to schedule recurring jobs');
  }

  const server = http.createServer(app);
  try {
    initWebsockets(server);
  } catch (e) {
    logger.warn(e, 'Failed to initialize websockets');
  }
  server.listen(config.port, () => logger.info(`API listening on :${config.port}`));
}

start().catch(e => {
  logger.error(e, 'Failed to start');
  process.exit(1);
});
