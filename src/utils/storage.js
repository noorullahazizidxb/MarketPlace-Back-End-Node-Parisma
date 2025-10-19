import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

// Small sleep helper for retry backoff
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Attempt to move a file, handling Windows locks and cross-device issues gracefully
async function moveWithRetries(src, dest, { attempts = 5, baseDelay = 50 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      await fs.rename(src, dest);
      return; // success
    } catch (e) {
      lastErr = e;
      // Errors that are commonly transient on Windows or require fallback
      const code = e && e.code;
      const transient = code === 'EBUSY' || code === 'EPERM' || code === 'EACCES';
      const crossDevice = code === 'EXDEV';

      if (crossDevice) {
        // Immediate fallback to copy+unlink for cross-device renames
        return copyThenUnlink(src, dest);
      }

      if (transient) {
        // Wait and retry a few times; antivirus/indexers often keep file handles briefly
        await sleep(baseDelay * Math.pow(2, i));
        continue;
      }
      // Unknown error: break and rethrow
      break;
    }
  }
  // If we exhausted retries, attempt copy+unlink fallback as a last resort
  try {
    await copyThenUnlink(src, dest);
  } catch (e2) {
    // Preserve original error context
    throw lastErr || e2;
  }
}

async function copyThenUnlink(src, dest) {
  const data = await fs.readFile(src);
  await fs.writeFile(dest, data);
  try { await fs.unlink(src); } catch { /* ignore unlink failure */ }
}

export const storage = {
  async saveTempTo(destDir, tempPath, originalName) {
    try {
      await fs.mkdir(destDir, { recursive: true });
      // sanitize originalName to avoid path traversal and invalid chars
      const baseName = (originalName || 'file')
        .replace(/\\/g, '/')
        .split('/')
        .pop()
        .replace(/[^A-Za-z0-9._-]+/g, '_');
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const dest = path.join(destDir, `${unique}_${baseName}`);
      await moveWithRetries(tempPath, dest, { attempts: 6, baseDelay: 60 });
      return dest;
    } catch (e) {
      logger.error({ err: e?.message, code: e?.code, from: tempPath, to: destDir }, 'Failed to save temp file');
      throw e;
    }
  },
  async deletePath(p) {
    try {
      if (!p) return;
      const rel = p.startsWith('/') ? p.slice(1) : p;
      // normalize for OS path separators and ensure relative to CWD
      const filePath = path.isAbsolute(rel) ? rel : path.join(process.cwd(), path.normalize(rel));
      try {
        await fs.unlink(filePath);
        logger.info({ path: filePath }, 'Deleted file');
      } catch (e) {
        // file may not exist; ignore
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'Failed to delete file');
    }
  },
  async deleteDirectory(dir) {
    try {
      if (!dir) return;
      const rel = dir.startsWith('/') ? dir.slice(1) : dir;
      const dirPath = path.isAbsolute(rel) ? rel : path.join(process.cwd(), path.normalize(rel));
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
        logger.info({ dir: dirPath }, 'Deleted directory');
      } catch (e) {
        // ignore if not exists
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'Failed to delete directory');
    }
  }
};
