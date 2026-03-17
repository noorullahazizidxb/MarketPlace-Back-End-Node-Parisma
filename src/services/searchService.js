import { getES } from '../search/elasticsearch.js';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';

export const searchService = {
  async search(params) {
    if (!config.elastic.enabled) {
      const { q, category, listingType, minPrice, maxPrice, location, page = 1, perPage = 20 } = params;
      const where = {
        status: 'APPROVED',
        ...(category ? { category: { slug: category } } : {}),
        ...(listingType ? { listingType } : {}),
        ...(location ? { location: { contains: location } } : {}),
        ...(minPrice || maxPrice ? {
          price: {
            ...(minPrice ? { gte: Number(minPrice) } : {}),
            ...(maxPrice ? { lte: Number(maxPrice) } : {})
          }
        } : {}),
        ...(q ? {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { location: { contains: q } }
          ]
        } : {})
      };

      const [total, listings] = await Promise.all([
        prisma.listing.count({ where }),
        prisma.listing.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * perPage,
          take: perPage,
          include: { category: true, images: true }
        })
      ]);

      return {
        total,
        hits: listings.map((listing) => ({
          id: listing.id,
          title: listing.title,
          description: listing.description,
          category: listing.category?.slug || null,
          listingType: listing.listingType,
          status: listing.status,
          price: Number(listing.price),
          currency: listing.currency,
          location: listing.location,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          images: listing.images,
        }))
      };
    }

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
