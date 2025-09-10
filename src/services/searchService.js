import { getES } from '../search/elasticsearch.js';
import { config } from '../config/index.js';

export const searchService = {
  async search(params) {
    const client = getES();
    const index = config.elastic.index;
    const { q, category, listingType, status, minPrice, maxPrice, location, page = 1, perPage = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params;

    const must = [];
    const filter = [];

    if (q) {
      must.push({ multi_match: { query: q, fields: ['title^3', 'description'] } });
    }
    if (category) filter.push({ term: { category } });
    if (listingType) filter.push({ term: { listingType } });
    if (status) filter.push({ term: { status } });
    if (minPrice || maxPrice) {
      const range = {};
      if (minPrice) range.gte = minPrice;
      if (maxPrice) range.lte = maxPrice;
      filter.push({ range: { price: range } });
    }
    if (location) filter.push({ match: { location } });

    const body = {
      query: {
        bool: {
          must: must.length ? must : [{ match_all: {} }],
          filter
        }
      },
      sort: [{ [sortBy]: { order: sortOrder } }],
      from: (page - 1) * perPage,
      size: perPage
    };

    const resp = await client.search({ index, body });
    const hits = resp.hits.hits.map(h => ({ id: h._id, score: h._score, ...h._source }));
    return { total: resp.hits.total?.value ?? 0, hits };
  }
};
