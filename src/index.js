import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';
import { initQueues } from './jobs/queues.js';
import { initBlogsIndex, initSearch, initUsersIndex } from './search/elasticsearch.js';
import { scheduleRecurringJobs } from './schedulers/cron.js';
import { initWebsockets } from './websocket/socket.js';
import { registerWorkers } from './workers/register.js';
import {
  isVercelRuntime,
  queueEnabled,
  searchEnabled,
  socketEnabled,
  runtimeSummary,
} from './lib/runtime.js';

export { app };

if (!isVercelRuntime) {
  async function start() {
    try {
      if (searchEnabled) {
        await initSearch();
        await initUsersIndex();
        await initBlogsIndex();
      } else {
        logger.info('Elasticsearch disabled; using database-backed search fallbacks');
      }
    } catch (e) {
      logger.warn(e, 'Elasticsearch init failed - continuing without search');
    }

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

    await registerWorkers();

    const server = http.createServer(app);
    if (socketEnabled) {
      try {
        initWebsockets(server);
      } catch (e) {
        logger.warn(e, 'Failed to initialize websockets');
      }
    } else {
      logger.info('Socket.IO disabled');
    }

    server.listen(config.port, () => {
      logger.info(`API listening on :${config.port}`);
      logger.info({ runtime: runtimeSummary() }, 'runtime');
    });
  }

  start().catch((e) => {
    logger.error(e, 'Failed to start');
    process.exit(1);
  });
}
