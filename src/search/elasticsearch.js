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

export async function initUsersIndex() {
  const client = getES();
  const index = config.elastic.usersIndex;
  const exists = await client.indices.exists({ index });
  if (!exists) {
    await client.indices.create({
      index,
      settings: {
        number_of_shards: 1,
        analysis: {
          analyzer: {
            edge_ngram_analyzer: {
              type: 'custom',
              tokenizer: 'edge_ngram_tokenizer',
              filter: ['lowercase']
            }
          },
          tokenizer: {
            edge_ngram_tokenizer: {
              type: 'edge_ngram',
              min_gram: 1,
              max_gram: 20,
              token_chars: ['letter','digit']
            }
          }
        }
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          email: { type: 'keyword' },
          fullName: { type: 'search_as_you_type' },
          firstName: { type: 'search_as_you_type' },
            lastName: { type: 'search_as_you_type' },
          fullNameCompletion: { type: 'completion' },
          phone: { type: 'keyword' },
          metadata: { type: 'object', enabled: false },
          createdAt: { type: 'date' }
        }
      }
    });
    logger.info({ index }, 'Created Elasticsearch users index');
  }
}

export async function indexUser(user) {
  const client = getES();
  const index = config.elastic.usersIndex;
  try {
    await client.index({ index, id: String(user.id), body: { id: String(user.id), email: user.email, fullName: user.fullName, firstName: user.firstName, lastName: user.lastName, phone: user.phone, createdAt: user.createdAt, fullNameCompletion: user.fullName } });
    await client.indices.refresh({ index });
  } catch (e) {
    logger.warn(e, 'Failed to index user');
  }
}

export async function searchUsers(query, { page = 1, perPage = 50 } = {}) {
  const client = getES();
  const index = config.elastic.usersIndex;
  const from = (page - 1) * perPage;
  const body = {
    from,
    size: perPage,
    query: {
      multi_match: {
        query,
        fields: ['fullName^3', 'email^2', 'firstName', 'lastName', 'phone']
      }
    }
  };
  const res = await client.search({ index, body });
  const hits = res.hits?.hits || [];
  return { total: res.hits.total?.value || 0, results: hits.map(h => h._source) };
}

export async function suggestUsers(prefix, { size = 10 } = {}) {
  const client = getES();
  const index = config.elastic.usersIndex;
  // Attempt completion suggester first; fallback to bool_prefix on search_as_you_type fields
  try {
    const suggestRes = await client.search({
      index,
      size: 0,
      suggest: {
        name_suggest: {
          prefix,
          completion: { field: 'fullNameCompletion', size }
        }
      }
    });
    const options = suggestRes.suggest?.name_suggest?.[0]?.options || [];
    let suggestions = options.map(o => o._source?.fullName || o.text).filter(Boolean);
    if (!suggestions.length) throw new Error('No completion suggestions');
    suggestions = [...new Set(suggestions)].slice(0, size);
    const nextChars = Array.from(new Set(suggestions
      .map(s => (s.length > prefix.length ? s.charAt(prefix.length) : null))
      .filter(Boolean)))
      .sort();
    return { prefix, suggestions, nextChars, strategy: 'completion' };
  } catch (e) {
    // Fallback to bool_prefix multi_match over search_as_you_type subfields
    try {
      const res = await client.search({
        index,
        size,
        query: {
          multi_match: {
            query: prefix,
            type: 'bool_prefix',
            fields: [
              'fullName', 'fullName._2gram', 'fullName._3gram',
              'firstName', 'firstName._2gram', 'firstName._3gram',
              'lastName', 'lastName._2gram', 'lastName._3gram'
            ]
          }
        }
      });
      const hits = res.hits?.hits || [];
      const suggestions = [...new Set(hits.map(h => h._source.fullName).filter(Boolean))].slice(0, size);
      const nextChars = Array.from(new Set(suggestions
        .map(s => (s.length > prefix.length ? s.charAt(prefix.length) : null))
        .filter(Boolean)))
        .sort();
      return { prefix, suggestions, nextChars, strategy: 'bool_prefix' };
    } catch (inner) {
      return { prefix, suggestions: [], nextChars: [], strategy: 'none', error: inner.message || String(inner) };
    }
  }
}
