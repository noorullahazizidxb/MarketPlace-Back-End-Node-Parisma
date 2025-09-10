import lruPkg from 'lru-cache';
const LRU = lruPkg?.default ?? lruPkg;

// Small LRU cache for quick responses (in-memory, per-process)
const opts = {
  max: 500,
  ttl: 1000 * 30 // 30 seconds
};

export const cache = new LRU(opts);

export function cacheMiddleware(keyFn, ttl = 30) {
  return (req, res, next) => {
    try {
      const key = keyFn(req);
      const v = cache.get(key);
      if (v) return res.apiSuccess(v, 'OK (cached)', 200);
      // monkey-patch res.apiSuccess to store value
      const orig = res.apiSuccess.bind(res);
      res.apiSuccess = (data, message = 'OK', status = 200) => {
        cache.set(key, data, { ttl: ttl * 1000 });
        return orig(data, message, status);
      };
    } catch (e) {
      // no-op on cache errors
    }
    next();
  };
}
