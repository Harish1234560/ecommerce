import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { API_PREFIX } from './constants/index.js';
import { webhook } from './controllers/payment.controller.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { requestLogger } from './middleware/requestLogger.js';
import apiRouter from './routes/index.js';
import seoRouter from './routes/seo.routes.js';
import { UPLOAD_DIR } from './services/storage.service.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
          frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com', 'https://www.google.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
    }),
  );

  // Only the storefront origin may call the API from a browser.
  app.use('/api', cors({ origin: env.CLIENT_URL, credentials: true, exposedHeaders: ['Content-Disposition'] }));
  app.use('/api', apiLimiter, requestLogger);

  // The payment webhook needs the raw bytes for signature verification, so it is registered
  // before the JSON body parser.
  app.post(`${API_PREFIX}/payments/webhook`, express.raw({ type: '*/*', limit: '1mb' }), webhook);

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use(API_PREFIX, apiRouter);
  app.use('/api', notFoundHandler); // unknown API paths answer with JSON, never the SPA

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, index: false }));
  app.use(seoRouter);

  // In production the API also serves the built storefront (frontend/dist) with SPA fallback.
  const frontendDist = fileURLToPath(new URL('../../frontend/dist', import.meta.url));
  if (existsSync(path.join(frontendDist, 'index.html'))) {
    app.use(express.static(frontendDist, { maxAge: '1h', index: false }));
    app.use('/assets', notFoundHandler);
    app.get(/.*/, (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
