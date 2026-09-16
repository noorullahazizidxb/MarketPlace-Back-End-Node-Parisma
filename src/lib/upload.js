import fs from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';
import { blobEnabled, isVercelRuntime } from './runtime.js';

let warnedTmp = false;

/**
 * Persistent uploads live under ./uploads on this machine.
 * Only the real Vercel serverless runtime (VERCEL=1) uses /tmp —
 * HOSTING_PLATFORM=vercel alone (local Vercel-sim) must keep ./uploads
 * so seeded and disk files remain reachable.
 */
export function uploadsRoot() {
  if (isVercelRuntime) return path.join(os.tmpdir(), 'uploads');
  return path.resolve(process.cwd(), 'uploads');
}

/**
 * Multer staging directory. Kept separate from the public root so
 * incomplete uploads are never served; storage.saveTempTo moves into uploadsRoot.
 */
export function uploadsDest() {
  const dest = isVercelRuntime
    ? path.join(os.tmpdir(), 'uploads', '_incoming')
    : path.join(process.cwd(), 'tmp', 'uploads');
  fs.mkdirSync(dest, { recursive: true });
  if (isVercelRuntime && !blobEnabled && !warnedTmp) {
    warnedTmp = true;
    console.warn(
      'VERCEL=1 without BLOB_READ_WRITE_TOKEN: uploads go to /tmp and will not persist',
    );
  }
  return dest;
}

/**
 * Resolve a logical `uploads/...` dir to the absolute public root
 * (./uploads locally, /tmp/uploads on real Vercel).
 */
export function resolveUploadDir(destDir) {
  const normalized = String(destDir || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  const withoutPrefix = normalized.replace(/^uploads\/?/i, '');
  return path.join(uploadsRoot(), withoutPrefix);
}

export function createUpload() {
  return multer({ dest: uploadsDest() });
}

/**
 * Turn a disk path or relative uploads path into a browser URL (`/uploads/...`
 * or absolute Blob URL). Never leak absolute OS paths to clients.
 */
export function publicFileUrl(file, relativePath) {
  const candidate = relativePath || file?.blobUrl || file?.path || file?.filename;
  if (!candidate || typeof candidate !== 'string') return null;
  if (/^https?:\/\//i.test(candidate)) return candidate;

  const normalized = candidate.replace(/\\/g, '/');
  const root = uploadsRoot().replace(/\\/g, '/');

  if (normalized === root || normalized.startsWith(`${root}/`)) {
    const rel = normalized.slice(root.length).replace(/^\/+/, '');
    return rel ? `/uploads/${rel}` : '/uploads';
  }

  const uploadsIdx = normalized.toLowerCase().lastIndexOf('/uploads/');
  if (uploadsIdx >= 0) {
    return `/uploads/${normalized.slice(uploadsIdx + '/uploads/'.length)}`;
  }

  if (/^uploads\//i.test(normalized)) {
    return `/${normalized.replace(/^\/+/, '')}`;
  }

  return normalized.startsWith('/') ? normalized : `/${normalized.replace(/^\/+/, '')}`;
}
