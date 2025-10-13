import IORedis from 'ioredis';
import { config } from '../config/index.js';

let client;
export function getRedis() {
  if (!client) {
  const opts = { maxRetriesPerRequest: null, lazyConnect: false };
    // If username/password are provided separately, pass them in options.
    if (config.redisUsername) opts.username = config.redisUsername;
    if (config.redisPassword) opts.password = config.redisPassword;
    // Prefer URL if provided (it may also contain credentials), otherwise pass options only.
    client = config.redisUrl ? new IORedis(config.redisUrl, opts) : new IORedis(opts);
    client.on('error', (e) => console.error('Redis error', e));
  }
  return client;
}
