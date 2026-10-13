import fs from 'node:fs/promises';
import path from 'node:path';
import { blobEnabled, isVercelRuntime } from '../lib/runtime.js';

const LOCAL_FILE = path.join(process.cwd(), '.data', 'ui-context.json');
const BLOB_PATH = 'marketplace/ui-context.json';

async function readBlobState() {
  const { get } = await import('@vercel/blob');
  const blob = await get(BLOB_PATH, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (!blob) return null;

  const chunks = [];
  for await (const chunk of blob.stream) {
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
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
    });
    return state;
  }

  if (isVercelRuntime) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required for UI context storage');
  }

  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, serialized, 'utf8');
  return state;
}
