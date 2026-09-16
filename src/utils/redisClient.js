import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { redisEnabled } from '../lib/runtime.js';

let client;

export function getRedis() {
  if (!redisEnabled) return null;
  if (!client) {
    const opts = { maxRetriesPerRequest: null, lazyConnect: false };
    if (config.redisUsername) opts.username = config.redisUsername;
    if (config.redisPassword) opts.password = config.redisPassword;
    client = config.redisUrl ? new IORedis(config.redisUrl, opts) : new IORedis(opts);
    client.on('error', (e) => console.error('Redis error', e?.message || e));
  }
  return client;
}
