import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { logger } from '../utils/logger.js';

// Compress a single multer file in-place by writing to a temp file and swapping paths
async function compressOne(file) {
  if (!file || !file.path) return;
  const { mimetype } = file;
  if (!mimetype || !mimetype.startsWith('image/')) return; // skip non-images

  const input = file.path;
  const tmpOut = `${input}.c`; // temporary compressed output
  try {
    // Determine output format options based on mime
    const image = sharp(input).rotate(); // auto-orient using EXIF
    const meta = await image.metadata().catch(() => ({}));
    const maxDim = 2000; // reasonable cap for web delivery
    if ((meta.width && meta.width > maxDim) || (meta.height && meta.height > maxDim)) {
      image.resize({ width: meta.width > meta.height ? maxDim : undefined, height: meta.height >= meta.width ? maxDim : undefined, fit: 'inside', withoutEnlargement: true });
    }

    if (mimetype.includes('jpeg') || mimetype.includes('jpg')) {
      await image.jpeg({ quality: 78, mozjpeg: true }).toFile(tmpOut);
    } else if (mimetype.includes('png')) {
      await image.png({ compressionLevel: 9, adaptiveFiltering: true, palette: true }).toFile(tmpOut);
    } else if (mimetype.includes('webp')) {
      await image.webp({ quality: 78 }).toFile(tmpOut);
    } else if (mimetype.includes('avif')) {
      await image.avif({ quality: 50 }).toFile(tmpOut);
    } else if (mimetype.includes('gif')) {
      // Sharp has limited GIF support; skip to avoid unexpected behavior
      return;
    } else {
      // Unknown image type; skip
      return;
    }

    // Replace original temp path with compressed file
    try { await fs.unlink(input); } catch {}
    await fs.rename(tmpOut, input);
    try {
      const stat = await fs.stat(input);
      file.size = stat.size;
    } catch {}
  } catch (e) {
    // Cleanup tmpOut on failure
    try { await fs.unlink(tmpOut); } catch {}
    logger.warn({ err: e?.message, file: path.basename(input) }, 'Failed to compress uploaded image');
  }
}

export async function compressUploads(req, res, next) {
  try {
    if (Array.isArray(req.files) && req.files.length) {
      await Promise.all(req.files.map(f => compressOne(f)));
    } else if (req.file) {
      await compressOne(req.file);
    }
  } catch (e) {
    logger.warn({ err: e?.message }, 'Compression middleware encountered an error');
  }
  return next();
}

export default compressUploads;
