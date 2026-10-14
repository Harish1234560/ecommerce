import { rateLimit } from 'express-rate-limit';
import { isProd } from '../config/env.js';

const limiter = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message, error: { code: 'RATE_LIMITED' } },
  });

// General protection for the whole API.
export const apiLimiter = limiter(60_000, isProd ? 300 : 5000, 'Too many requests. Please slow down.');

// Brute-force protection for credential endpoints (login, register, password reset).
export const credentialLimiter = limiter(15 * 60_000, isProd ? 20 : 500, 'Too many attempts. Please try again in a few minutes.');
