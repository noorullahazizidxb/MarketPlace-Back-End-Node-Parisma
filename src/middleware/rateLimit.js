import rateLimit from 'express-rate-limit';
import { getRedis } from '../utils/redisClient.js';
let RedisStore;
try {
  // require on demand to avoid adding it if not installed
  // eslint-disable-next-line import/no-extraneous-dependencies
  RedisStore = (await import('rate-limit-redis')).default;
} catch (e) {
  RedisStore = null;
}

function createLimiter(opts) {
  const store = RedisStore ? new RedisStore({ sendCommand: (...args) => getRedis().call(...args) }) : undefined;
  return rateLimit({ store, ...opts });
}

export const apiRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down' }
});

export const strictLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
});
