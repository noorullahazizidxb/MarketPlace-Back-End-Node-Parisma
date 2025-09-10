import { searchService } from '../services/searchService.js';
import { searchSchema } from '../validation/search.js';
import { logger } from '../utils/logger.js';
import { cacheMiddleware } from '../utils/cache.js';
import { cachedResponse } from '../utils/redisCache.js';

export const searchController = {
  async search(req, res) {
    try {
      const { error, value } = searchSchema.validate(req.query);
  if (error) return res.apiError(error.message, 400);

  // Use quick in-memory cache for identical queries to reduce ES load
  const key = `search:${JSON.stringify(req.query)}`;
  const results = await cachedResponse(key, async () => await searchService.search(value), 20);
  return res.apiSuccess(results, 'OK', 200);
    } catch (err) {
      logger.error(err, 'Search failed');
  return res.apiError('Search failed', 500);
    }
  }
};
