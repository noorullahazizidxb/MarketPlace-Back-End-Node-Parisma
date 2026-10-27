import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';
import { prisma } from './config/prisma.js';
import { closeQueues, initQueues } from './jobs/queues.js';
import { registerGracefulShutdown } from './lib/shutdown.js';
import { closeRedis } from './utils/redisClient.js';
import { initBlogsIndex, initSearch, initUsersIndex } from './search/elasticsearch.js';
import { scheduleRecurringJobs } from './schedulers/cron.js';
import { closeWebsockets, initWebsockets } from './websocket/socket.js';
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

    const workers = await registerWorkers();

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

    registerGracefulShutdown({
      // Socket.IO's close() disconnects clients and closes the HTTP server; server.close() then
      // covers the case where websockets failed to initialise (ERR_SERVER_NOT_RUNNING is tolerated).
      server: socketEnabled ? { close: (cb) => closeWebsockets().then(() => server.close(cb)) } : server,
      cleanups: [
        () => Promise.all(workers.map((w) => w.close())),
        closeQueues,
        closeRedis,
        () => prisma.$disconnect(),
      ],
      timeoutMs: Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10_000,
      logger,
    });
  }

  start().catch((e) => {
    logger.error(e, 'Failed to start');
    process.exit(1);
  });
}
