import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

// One line per API request: method, path, status and duration. Query strings are left out so
// search terms and tokens never end up in logs.
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    const line = `${req.method} ${req.baseUrl}${req.path} ${res.statusCode} ${ms.toFixed(0)}ms`;
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.debug(line);
  });
  next();
}
