import { getRedis } from './redisClient.js';
import { cache } from './cache.js';

export async function redisGet(key) {
  const redis = getRedis();
  if (!redis) {
    const local = cache.get(key);
    return local === undefined ? null : local;
  }
  try {
    const v = await redis.get(key);
    if (!v) return null;
    return JSON.parse(v);
  } catch {
    const local = cache.get(key);
    return local === undefined ? null : local;
  }
}

export async function redisSet(key, value, ttlSec = 30) {
  const redis = getRedis();
  cache.set(key, value, { ttl: Math.max(1, ttlSec) * 1000 });
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', Math.max(1, ttlSec));
  } catch {
    // memory already set
  }
}

export async function redisDel(key) {
  cache.del(key);
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // ignore
  }
}

export async function cachedResponse(key, fetchFn, ttl = 30) {
  const r = await redisGet(key);
  if (r) return r;
  const local = cache.get(key);
  if (local) return local;
  const result = await fetchFn();
  await redisSet(key, result, ttl);
  return result;
}
