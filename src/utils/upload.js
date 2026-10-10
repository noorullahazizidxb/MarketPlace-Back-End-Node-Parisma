import multer from 'multer';
import { config } from '../config/index.js';

export function createUpload(dest = 'tmp/uploads') {
  if (config.runtime === 'serverless' || config.storage.driver === 's3') {
    return multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    });
  }
  return multer({ dest });
}
