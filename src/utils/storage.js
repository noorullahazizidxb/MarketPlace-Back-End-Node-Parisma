import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

export const storage = {
  saveTempTo(destDir, tempPath, originalName) {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, `${Date.now()}_${originalName}`);
    fs.renameSync(tempPath, dest);
    return dest;
  },
  deletePath(p) {
    try {
      if (!p) return;
      const rel = p.startsWith('/') ? p.slice(1) : p;
      if (fs.existsSync(rel)) {
        fs.unlinkSync(rel);
        logger.info({ path: rel }, 'Deleted file');
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'Failed to delete file');
    }
  },
  deleteDirectory(dir) {
    try {
      if (!dir) return;
      const rel = dir.startsWith('/') ? dir.slice(1) : dir;
      if (fs.existsSync(rel)) {
        fs.rmSync(rel, { recursive: true, force: true });
        logger.info({ dir: rel }, 'Deleted directory');
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'Failed to delete directory');
    }
  }
};
