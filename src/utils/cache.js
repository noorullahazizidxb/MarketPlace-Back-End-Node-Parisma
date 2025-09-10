// Lightweight in-memory LRU with TTL to avoid external lru-cache interop issues.
class SimpleLRU {
  constructor({ max = 500, ttl = 1000 * 30 } = {}) {
    this.max = max;
    this.ttl = ttl; // default ttl in ms
    this.map = new Map(); // preserves insertion order
  }

  _isExpired(entry) {
    return entry.expiresAt && Date.now() > entry.expiresAt;
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (this._isExpired(entry)) {
      this.map.delete(key);
      return undefined;
    }
    // refresh recency
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key, value, { ttl } = {}) {
    const expiresAt = ttl ? Date.now() + ttl : (this.ttl ? Date.now() + this.ttl : null);
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt });
    // evict oldest if over capacity
    while (this.map.size > this.max) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }
}

// Small LRU cache for quick responses (in-memory, per-process)
const opts = {
  max: 500,
  ttl: 1000 * 30 // 30 seconds
};

export const cache = new SimpleLRU(opts);

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
