import { Client } from '@elastic/elasticsearch';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let esClient;

export function getES() {
  if (!esClient) {
    const base = {
      node: config.elastic.node,
      auth: config.elastic.username ? {
        username: config.elastic.username,
        password: config.elastic.password
      } : undefined
    };

    // Allow self-signed certs when explicitly enabled in env.
    if (config.elastic.allowSelfSigned) {
      base.tls = { rejectUnauthorized: false };
      // also allow insecure connections for older clients
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    esClient = new Client(base);
  }
  return esClient;
}

export async function initSearch() {
  const client = getES();
  const index = config.elastic.index;
  const exists = await client.indices.exists({ index });
  if (!exists) {
    await client.indices.create({
      index,
      settings: {
        number_of_shards: 1,
        analysis: { analyzer: { custom_text: { type: 'standard' } } }
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: { type: 'text', analyzer: 'standard' },
          description: { type: 'text' },
          category: { type: 'keyword' },
          listingType: { type: 'keyword' },
          status: { type: 'keyword' },
          price: { type: 'double' },
          currency: { type: 'keyword' },
          location: { type: 'text' },
          address: { type: 'text' },
          userId: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' }
        }
      }
    });
    logger.info({ index }, 'Created Elasticsearch index');
  }
}
