import pino from 'pino';
import { config } from '../config/index.js';

// pino-pretty runs in a worker thread that serverless bundles (Vercel) can't resolve; only use it locally.
const prettyLogs = config.env !== 'production' && !process.env.VERCEL;

export const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
  transport: !prettyLogs ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' }
  }
});
