import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
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
  const redis = config.redis.connect ? getRedis() : null;
  const store = RedisStore && redis
    ? new RedisStore({ sendCommand: (...args) => redis.call(...args) })
    : undefined;
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
