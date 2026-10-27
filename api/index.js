import 'dotenv/config';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { registerGracefulShutdown } from '../src/lib/shutdown.js';
import { logger } from '../src/utils/logger.js';

export const maxDuration = 60;
export const config = {
  api: {
    bodyParser: false,
  },
};

// Vercel sends SIGTERM before an instance is torn down and allows ~500ms for cleanup.
registerGracefulShutdown({ cleanups: [() => prisma.$disconnect()], timeoutMs: 400, logger });

export default app;
