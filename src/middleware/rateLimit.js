import rateLimit from 'express-rate-limit';
import { getRedis } from '../utils/redisClient.js';
import { redisEnabled } from '../lib/runtime.js';

let RedisStore;
try {
  RedisStore = (await import('rate-limit-redis')).default;
} catch {
  RedisStore = null;
}

function createLimiter(opts) {
  const redis = redisEnabled ? getRedis() : null;
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
