#!/usr/bin/env node
import { getRedis } from '../src/utils/redisClient.js';
import { getES } from '../src/search/elasticsearch.js';
import { config } from '../src/config/index.js';

async function checkRedis() {
  try {
    const r = getRedis();
    const pong = await r.ping();
    console.log('Redis PING ->', pong);
    return true;
  } catch (e) {
    console.error('Redis check failed:', e.message || e);
    return false;
  }
}

async function checkES() {
  if (!config.elastic.enabled) {
    console.log('Elasticsearch check skipped -> ENABLE-ELASTIC-SEARCH=false');
    return true;
  }
  try {
    const es = getES();
    const info = await es.info();
    console.log('Elasticsearch cluster ->', info.cluster_name || info.name || 'unknown');
    return true;
  } catch (e) {
    console.error('Elasticsearch check failed:', e.message || e);
    return false;
  }
}

async function main() {
  console.log('Checking services using config:', { redisUrl: config.redisUrl, elasticNode: config.elastic.node });
  const [rOk, esOk] = await Promise.all([checkRedis(), checkES()]);
  if (!rOk || !esOk) process.exit(2);
  console.log('All checks passed');
  process.exit(0);
}

main();
