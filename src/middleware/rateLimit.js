import rateLimit from 'express-rate-limit';
import { getRedis } from '../utils/redisClient.js';
import { redisEnabled } from '../lib/runtime.js';

let RedisStore;
try {
  RedisStore = (await import('rate-limit-redis')).default;
} catch {
  RedisStore = null;
}

function createLimiter({ prefix, ...opts }) {
  const redis = redisEnabled ? getRedis() : null;
  const store = RedisStore && redis
    ? new RedisStore({ sendCommand: (...args) => redis.call(...args), ...(prefix ? { prefix } : {}) })
    : undefined;
  return rateLimit({ store, ...opts });
}

import { config } from '../config/index.js';

// Consistent envelope for throttled requests (works before/without responseWrapper).
function throttledHandler(message) {
  return (req, res, _next, options) => {
    const payload = { message, statusCode: options.statusCode, success: false, entity: res.locals?.entityName ?? null, error: { code: 'RATE_LIMITED' } };
    res.status(options.statusCode).json(payload);
  };
}

export const apiRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: throttledHandler('Too many requests, please slow down')
});

export const strictLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: throttledHandler('Too many requests')
});

// Brute-force protection for credential endpoints: counts failed attempts per IP + email.
export const loginRateLimiter = createLimiter({
  windowMs: config.loginRateLimit.windowMs,
  max: config.loginRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  prefix: 'rl:login:',
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email || '').trim().toLowerCase()}`,
  handler: throttledHandler('Too many sign-in attempts. Please try again in a few minutes'),
});

export const refreshRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: throttledHandler('Too many session refresh attempts'),
});
