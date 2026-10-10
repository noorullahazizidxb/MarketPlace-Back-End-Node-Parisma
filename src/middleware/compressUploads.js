import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { logger } from '../utils/logger.js';

function outputBuffer(image, mimetype) {
  if (mimetype.includes('jpeg') || mimetype.includes('jpg')) return image.jpeg({ quality: 78, mozjpeg: true }).toBuffer();
  if (mimetype.includes('png')) return image.png({ compressionLevel: 9, adaptiveFiltering: true, palette: true }).toBuffer();
  if (mimetype.includes('webp')) return image.webp({ quality: 78 }).toBuffer();
  if (mimetype.includes('avif')) return image.avif({ quality: 50 }).toBuffer();
  return null;
}

function resized(image, meta) {
  const maxDim = 2000;
  if ((meta.width && meta.width > maxDim) || (meta.height && meta.height > maxDim)) {
    image.resize({ width: meta.width > meta.height ? maxDim : undefined, height: meta.height >= meta.width ? maxDim : undefined, fit: 'inside', withoutEnlargement: true });
  }
  return image;
}

async function compressBuffer(file) {
  const { mimetype } = file;
  if (!mimetype || !mimetype.startsWith('image/') || mimetype.includes('gif') || !file.buffer) return;
  try {
    let image = sharp(file.buffer).rotate();
    const meta = await image.metadata().catch(() => ({}));
    image = resized(image, meta);
    const out = await outputBuffer(image, mimetype);
    if (!out) return;
    file.buffer = out;
    file.size = out.length;
  } catch (e) {
    logger.warn({ err: e?.message }, 'Failed to compress uploaded image buffer');
  }
}

// Compress a single multer file in-place by writing to a temp file and swapping paths
async function compressOne(file) {
  if (!file) return;
  if (file.buffer && !file.path) return compressBuffer(file);
  if (!file.path) return;
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

    // Replace original temp path with compressed file (Windows-safe)
    try { await fs.unlink(input); } catch {}
    try {
      await fs.rename(tmpOut, input);
    } catch (e) {
      const code = e && e.code;
      if (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES' || code === 'EXDEV') {
        // Fallback: copy then unlink tmpOut
        const data = await fs.readFile(tmpOut);
        await fs.writeFile(input, data);
        try { await fs.unlink(tmpOut); } catch {}
      } else {
        throw e;
      }
    }
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

// Expose a utility to compress a single file path (compatible with multer file-like objects)
export async function compressFile(tmpPath, mimetype) {
  if (!tmpPath) return;
  const fake = { path: tmpPath, mimetype };
  return compressOne(fake);
}

export async function compressUploads(req, res, next) {
  try {
    if (Array.isArray(req.files) && req.files.length) {
      // Run sequentially to minimize Windows file lock contention
      for (const f of req.files) {
        // eslint-disable-next-line no-await-in-loop
        await compressOne(f);
      }
    } else if (req.file) {
      await compressOne(req.file);
    }
  } catch (e) {
    logger.warn({ err: e?.message }, 'Compression middleware encountered an error');
  }
  return next();
}

export default compressUploads;
