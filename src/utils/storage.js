import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

export const storage = {
  async saveTempTo(destDir, tempPath, originalName) {
    try {
      await fs.mkdir(destDir, { recursive: true });
      const dest = path.join(destDir, `${Date.now()}_${originalName}`);
      await fs.rename(tempPath, dest);
      return dest;
    } catch (e) {
      logger.error(e, 'Failed to save temp file');
      throw e;
    }
  },
  async deletePath(p) {
    try {
      if (!p) return;
      const rel = p.startsWith('/') ? p.slice(1) : p;
      try {
        await fs.unlink(rel);
        logger.info({ path: rel }, 'Deleted file');
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
      try {
        await fs.rm(rel, { recursive: true, force: true });
        logger.info({ dir: rel }, 'Deleted directory');
      } catch (e) {
        // ignore if not exists
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'Failed to delete directory');
    }
  }
};
