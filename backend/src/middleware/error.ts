import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { isProd } from '../config/env.js';
import { ApiError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Error envelope: { success: false, message, error: { code?, fields? } }.
function fail(res: Response, status: number, message: string, error: { code?: string; fields?: Record<string, string> } = {}) {
  return res.status(status).json({ success: false, message, error });
}

export function notFoundHandler(req: Request, res: Response) {
  fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`, { code: 'ROUTE_NOT_FOUND' });
}

// Central error handler: every thrown error ends up here and leaves as the same JSON shape.
 
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return fail(res, err.status, err.message, { code: err.code, fields: err.fields });
  }

  if (err instanceof multer.MulterError) {
    return fail(res, 400, err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : 'Invalid upload', { code: err.code });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? (err.meta.target as string[]).join(', ') : 'value';
      return fail(res, 409, `That ${target} is already in use`, { code: 'DUPLICATE' });
    }
    if (err.code === 'P2025') return fail(res, 404, 'Record not found', { code: 'NOT_FOUND' });
    if (err.code === 'P2003') return fail(res, 409, 'This record is referenced by other data and cannot be changed', { code: 'IN_USE' });
  }

  // body-parser errors (malformed JSON, payload too large)
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = (err as { type?: string }).type;
    if (type === 'entity.parse.failed') return fail(res, 400, 'Malformed JSON body', { code: 'BAD_JSON' });
    if (type === 'entity.too.large') return fail(res, 413, 'Request body too large', { code: 'TOO_LARGE' });
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
  // Never leak internals (stack traces, SQL) to clients in production.
  fail(res, 500, isProd ? 'Something went wrong. Please try again.' : err instanceof Error ? err.message : 'Internal server error', { code: 'INTERNAL' });
}
