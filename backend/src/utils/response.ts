import type { Response } from 'express';

interface SuccessOptions {
  message?: string;
  meta?: Record<string, unknown>;
  status?: number;
}

// Every successful response has the same envelope: { success, message, data, meta? }.
export function ok<T>(res: Response, data: T, options: SuccessOptions = {}) {
  const { message = 'Success', meta, status = 200 } = options;
  return res.status(status).json({ success: true, message, data, ...(meta ? { meta } : {}) });
}

export const created = <T>(res: Response, data: T, message = 'Created') => ok(res, data, { status: 201, message });

export function pageMeta(total: number, page: number, limit: number) {
  return { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

// Lets browsers (and any CDN) reuse a public, non-personal response for a short time, and serve a
// slightly stale copy while revalidating. Every other API response is `no-store` (see app.ts).
export function publicCache(res: Response, maxAgeSeconds: number) {
  res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 4}`);
}
