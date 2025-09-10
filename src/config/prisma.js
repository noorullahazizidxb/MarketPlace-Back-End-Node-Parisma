import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

let prisma;

if (!global.__prisma) {
  prisma = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' }
    ]
  });
  prisma.$on('error', (e) => logger.error(e, 'Prisma error'));
  prisma.$on('warn', (e) => logger.warn(e, 'Prisma warn'));
  prisma.$on('query', (e) => logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Prisma query'));
  global.__prisma = prisma;
} else {
  prisma = global.__prisma;
}

export { prisma };
