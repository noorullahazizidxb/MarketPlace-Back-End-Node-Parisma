import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';
import { logger } from './logger.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function moveWithRetries(src, dest, { attempts = 5, baseDelay = 50 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      await fs.rename(src, dest);
      return;
    } catch (e) {
      lastErr = e;
      const code = e && e.code;
      const transient = code === 'EBUSY' || code === 'EPERM' || code === 'EACCES';
      const crossDevice = code === 'EXDEV';

      if (crossDevice) {
        return copyThenUnlink(src, dest);
      }

      if (transient) {
        await sleep(baseDelay * Math.pow(2, i));
        continue;
      }
      break;
    }
  }
  try {
    await copyThenUnlink(src, dest);
  } catch (e2) {
    throw lastErr || e2;
  }
}

async function copyThenUnlink(src, dest) {
  const data = await fs.readFile(src);
  await fs.writeFile(dest, data);
  try { await fs.unlink(src); } catch { /* ignore unlink failure */ }
}

function sanitizeName(originalName) {
  return (originalName || 'file')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[^A-Za-z0-9._-]+/g, '_');
}

function normalizeKey(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function sourceBuffer(source) {
  if (source && Buffer.isBuffer(source.buffer)) return source.buffer;
  return null;
}

function sourcePath(source) {
  if (typeof source === 'string' && source) return source;
  if (source && typeof source.path === 'string' && source.path) return source.path;
  return null;
}

function contentTypeFor(name, source) {
  if (source && source.mimetype) return source.mimetype;
  const ext = path.extname(name || '').toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.avif') return 'image/avif';
  return 'application/octet-stream';
}

let s3Client;
async function getS3() {
  if (!s3Client) {
    const { S3Client } = await import('@aws-sdk/client-s3');
    const options = {
      region: config.storage.region,
      forcePathStyle: config.storage.forcePathStyle,
    };
    if (config.storage.endpoint) options.endpoint = config.storage.endpoint;
    if (config.storage.accessKeyId && config.storage.secretAccessKey) {
      options.credentials = {
        accessKeyId: config.storage.accessKeyId,
        secretAccessKey: config.storage.secretAccessKey,
      };
    }
    s3Client = new S3Client(options);
  }
  return s3Client;
}

function objectKeyFromStored(stored) {
  if (!stored) return null;
  let value = String(stored);
  const base = config.storage.publicBaseUrl;
  if (base && value.startsWith(base)) value = value.slice(base.length);
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch { /* keep original */ }
  }
  return normalizeKey(value);
}

async function readSource(source) {
  const buffer = sourceBuffer(source);
  if (buffer) return buffer;
  const filePath = sourcePath(source);
  if (!filePath) throw new Error('Upload source is missing a path or buffer');
  return fs.readFile(filePath);
}

async function saveToS3(destDir, source, originalName) {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const baseName = sanitizeName(originalName);
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const key = `${normalizeKey(destDir)}/${unique}_${baseName}`;
  const body = await readSource(source);
  const client = await getS3();
  await client.send(new PutObjectCommand({
    Bucket: config.storage.bucket,
    Key: key,
    Body: body,
    ContentType: contentTypeFor(baseName, source),
  }));
  const filePath = sourcePath(source);
  if (filePath) {
    try { await fs.unlink(filePath); } catch { /* temp file may already be gone */ }
  }
  if (config.storage.publicBaseUrl) return `${config.storage.publicBaseUrl}/${key}`;
  return key;
}

async function deleteS3Key(key) {
  if (!key) return;
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const client = await getS3();
  await client.send(new DeleteObjectCommand({ Bucket: config.storage.bucket, Key: key }));
}

async function deleteS3Prefix(prefix) {
  const keyPrefix = normalizeKey(prefix);
  if (!keyPrefix) return;
  const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
  const client = await getS3();
  let token;
  do {
    const listed = await client.send(new ListObjectsV2Command({
      Bucket: config.storage.bucket,
      Prefix: keyPrefix.endsWith('/') ? keyPrefix : `${keyPrefix}/`,
      ContinuationToken: token,
    }));
    const objects = (listed.Contents || []).map((item) => ({ Key: item.Key }));
    if (objects.length) {
      await client.send(new DeleteObjectsCommand({
        Bucket: config.storage.bucket,
        Delete: { Objects: objects },
      }));
    }
    token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (token);
}

export const storage = {
  publicUrl(saved) {
    if (!saved) return saved;
    const value = String(saved).replace(/\\/g, '/');
    if (/^https?:\/\//i.test(value)) return value;
    return `/${value.replace(/^\/+/, '')}`;
  },

  async saveTempTo(destDir, source, originalName) {
    try {
      if (config.storage.driver === 's3') {
        return saveToS3(destDir, source, originalName);
      }

      await fs.mkdir(destDir, { recursive: true });
      const baseName = sanitizeName(originalName);
      const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const dest = path.join(destDir, `${unique}_${baseName}`);
      const filePath = sourcePath(source);
      if (filePath) {
        await moveWithRetries(filePath, dest, { attempts: 6, baseDelay: 60 });
      } else {
        const body = sourceBuffer(source);
        if (!body) throw new Error('Upload source is missing a path or buffer');
        await fs.writeFile(dest, body);
      }
      return dest;
    } catch (e) {
      logger.error({ err: e?.message, code: e?.code, to: destDir }, 'Failed to save temp file');
      throw e;
    }
  },

  async deletePath(stored) {
    try {
      if (!stored) return;
      if (config.storage.driver === 's3') {
        await deleteS3Key(objectKeyFromStored(stored));
        return;
      }
      const rel = String(stored).startsWith('/') ? String(stored).slice(1) : String(stored);
      const filePath = path.isAbsolute(rel) ? rel : path.join(process.cwd(), path.normalize(rel));
      try {
        await fs.unlink(filePath);
        logger.info({ path: filePath }, 'Deleted file');
      } catch {
        // file may not exist
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'Failed to delete file');
    }
  },

  async deleteDirectory(dir) {
    try {
      if (!dir) return;
      if (config.storage.driver === 's3') {
        await deleteS3Prefix(dir);
        return;
      }
      const rel = String(dir).startsWith('/') ? String(dir).slice(1) : String(dir);
      const dirPath = path.isAbsolute(rel) ? rel : path.join(process.cwd(), path.normalize(rel));
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
        logger.info({ dir: dirPath }, 'Deleted directory');
      } catch {
        // ignore if not exists
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'Failed to delete directory');
    }
  }
};
