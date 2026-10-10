import http from 'http';
import { app } from './app.js';
import { assertHostingConfig, config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initQueues } from './jobs/queues.js';
import { initBlogsIndex, initSearch, initUsersIndex } from './search/elasticsearch.js';
import { scheduleRecurringJobs } from './schedulers/cron.js';
import { initWebsockets } from './websocket/socket.js';

try {
  assertHostingConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

async function start() {
  try {
    if (config.elastic.enabled) {
      await initSearch();
      await initUsersIndex();
      await initBlogsIndex();
    } else {
      logger.info('Elasticsearch disabled; starting with database-backed search fallbacks');
    }
  } catch (e) {
    logger.warn(e, 'Elasticsearch init failed - continuing without search (make sure ES is running)');
  }

  if (config.workers.enabled) {
    await initQueues();
    try {
      const r = config.retention || {};
      const s = config.schedules || {};
      logger.info({ retention: r, schedules: s }, 'Retention and scheduled job times (days / HH:mm)');
    } catch (e) {
      logger.warn(e, 'Failed to log retention configuration');
    }
    try {
      await scheduleRecurringJobs();
    } catch (e) {
      logger.warn(e, 'Failed to schedule recurring jobs');
    }
    const { startBackgroundWorkers } = await import('./workers/startWorkers.js');
    await startBackgroundWorkers();
  } else {
    logger.info('ENABLE_WORKERS is off; skipping Redis queues and BullMQ workers');
  }

  const server = http.createServer(app);
  if (config.websockets.enabled) {
    try {
      initWebsockets(server);
    } catch (e) {
      logger.warn(e, 'Failed to initialize websockets');
    }
  } else {
    logger.info('WebSockets disabled');
  }
  server.listen(config.port, () => logger.info(`API listening on :${config.port}`));
}

start().catch(e => {
  logger.error(e, 'Failed to start');
  process.exit(1);
});
