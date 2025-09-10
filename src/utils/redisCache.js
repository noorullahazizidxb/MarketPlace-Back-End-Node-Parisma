import { getRedis } from './redisClient.js';
import { cache } from './cache.js';

const redis = getRedis();

export async function redisGet(key) {
  try {
    const v = await redis.get(key);
    if (!v) return null;
    return JSON.parse(v);
  } catch (e) {
    return null;
  }
}

export async function redisSet(key, value, ttlSec = 30) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', Math.max(1, ttlSec));
  } catch (e) {
    // fallback to in-memory LRU for transient failures
    cache.set(key, value);
  }
}

export async function cachedResponse(key, fetchFn, ttl = 30) {
  // Try Redis
  const r = await redisGet(key);
  if (r) return r;
  // Try LRU
  const local = cache.get(key);
  if (local) return local;
  const result = await fetchFn();
  await redisSet(key, result, ttl);
  return result;
}
