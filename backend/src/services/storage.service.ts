import { createHash, randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { ApiError, badRequest } from '../utils/errors.js';

// Image storage behind one interface so the provider can be switched with STORAGE_PROVIDER.
// "local" writes to UPLOAD_DIR (default backend/uploads, served at /uploads); "cloudinary" uploads to Cloudinary.
// To add S3, implement StorageProvider and register it in `providers` below.

export const UPLOAD_DIR = env.UPLOAD_DIR ? path.resolve(env.UPLOAD_DIR) : fileURLToPath(new URL('../../uploads', import.meta.url));
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

interface StorageProvider {
  upload(buffer: Buffer, ext: string, mime: string): Promise<string>;
  remove(url: string): Promise<void>;
}

// Trust the file's leading bytes, not the client-supplied name or MIME type.
export function sniffImage(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'GIF8') return { ext: 'gif', mime: 'image/gif' };
  return null;
}

const localProvider: StorageProvider = {
  async upload(buffer, ext) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}.${ext}`;
    await writeFile(path.join(UPLOAD_DIR, name), buffer);
    return `/uploads/${name}`;
  },
  async remove(url) {
    if (!url.startsWith('/uploads/')) return;
    const name = path.basename(url);
    await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
  },
};

const cloudinaryProvider: StorageProvider = {
  async upload(buffer, _ext, mime) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = env.CLOUDINARY_FOLDER;
    const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`).digest('hex');
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buffer)], { type: mime }));
    form.append('api_key', env.CLOUDINARY_API_KEY!);
    form.append('timestamp', timestamp);
    form.append('folder', folder);
    form.append('signature', signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
    if (!res.ok || !json.secure_url) throw new ApiError(502, `Image upload failed: ${json.error?.message ?? res.statusText}`);
    return json.secure_url;
  },
  async remove() {
    // Remote assets are left in place; clean up from the Cloudinary console if needed.
  },
};

const providers: Record<typeof env.STORAGE_PROVIDER, StorageProvider> = {
  local: localProvider,
  cloudinary: cloudinaryProvider,
};

export async function storeImage(buffer: Buffer): Promise<string> {
  const type = sniffImage(buffer);
  if (!type) throw badRequest('Only JPEG, PNG, WebP or GIF images are allowed');
  return providers[env.STORAGE_PROVIDER].upload(buffer, type.ext, type.mime);
}

export async function removeImage(url: string): Promise<void> {
  await providers[env.STORAGE_PROVIDER].remove(url);
}
