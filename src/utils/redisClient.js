import IORedis from 'ioredis';
import { config } from '../config/index.js';

let client;
export function getRedis() {
  if (!client) {
  client = new IORedis(config.redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });
    client.on('error', (e) => console.error('Redis error', e));
  }
  return client;
}
