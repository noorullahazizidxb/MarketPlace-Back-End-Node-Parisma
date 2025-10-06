import IORedis from 'ioredis';
import { config } from '../config/index.js';

let client;
export function getRedis() {
  if (!client) {
    const opts = { maxRetriesPerRequest: null, lazyConnect: false };
    // If a password is provided separately, pass it to the client options
    if (config.redisPassword) opts.password = config.redisPassword;
    // ioredis accepts a URL as first arg and options optionally contains password fallback
    client = new IORedis(config.redisUrl, opts);
    client.on('error', (e) => console.error('Redis error', e));
  }
  return client;
}
