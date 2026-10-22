import fs from 'node:fs/promises';
import path from 'node:path';
import { blobEnabled, isVercelRuntime } from '../lib/runtime.js';

const LOCAL_FILE = path.join(process.cwd(), '.data', 'ui-context.json');
const BLOB_PATH = 'marketplace/ui-context.json';

const RETRY_DELAYS_MS = [0, 150, 400, 900];
const FETCH_TIMEOUT_MS = 4000;

/** Last successfully read/written state, kept per warm instance. */
let lastGoodState = null;
let cachedBlobUrl = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function storeIdFromToken(token) {
  // vercel_blob_rw_<storeId>_<secret>
  const parts = String(token || '').split('_');
  return parts.length > 4 ? parts[3] : null;
}

function publicBlobUrl() {
  if (cachedBlobUrl) return cachedBlobUrl;
  const storeId = storeIdFromToken(process.env.BLOB_READ_WRITE_TOKEN);
  if (!storeId) return null;
  cachedBlobUrl = `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com/${BLOB_PATH}`;
  return cachedBlobUrl;
}

/**
 * Read the public blob straight from the CDN without an Authorization header.
 * The SDK's authenticated `get()` intermittently returns 403 for public stores.
 * Returns undefined when the blob does not exist.
 */
async function fetchPublicBlob() {
  const base = publicBlobUrl();
  if (!base) throw new Error('Cannot derive blob URL from BLOB_READ_WRITE_TOKEN');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}?v=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`Blob CDN responded ${response.status}`);
    return JSON.parse(await response.text());
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaSdk() {
  const { get } = await import('@vercel/blob');
  const blob = await get(BLOB_PATH, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (!blob) return undefined;
  const chunks = [];
  for await (const chunk of blob.stream) {
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function readBlobState() {
  let lastError;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    for (const reader of [fetchPublicBlob, fetchViaSdk]) {
      try {
        const state = await reader();
        if (state === undefined) return lastGoodState;
        lastGoodState = state;
        return state;
      } catch (error) {
        lastError = error;
      }
    }
  }
  if (lastGoodState) return lastGoodState;
  throw lastError;
}

export async function readUiContextState() {
  if (blobEnabled) return readBlobState();
  if (isVercelRuntime) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required for UI context storage');
  }

  try {
    const raw = await fs.readFile(LOCAL_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeUiContextState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new TypeError('UI context must be a JSON object');
  }

  const serialized = `${JSON.stringify(state)}\n`;
  if (blobEnabled) {
    const { put } = await import('@vercel/blob');
    await put(BLOB_PATH, serialized, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    });
    lastGoodState = state;
    return state;
  }

  if (isVercelRuntime) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required for UI context storage');
  }

  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, serialized, 'utf8');
  return state;
}
