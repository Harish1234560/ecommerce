import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
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
import { renderSeoHead, resolveSeo } from './services/seo.service.js';
import { getSettings } from './services/settings.service.js';
import { UPLOAD_DIR } from './services/storage.service.js';
import { logger } from './utils/logger.js';

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
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
          frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com', 'https://www.google.com'],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
    }),
  );

  // gzip/brotli for JSON, HTML, JS and CSS — the biggest win on slow mobile connections.
  app.use(compression());

  const allowedOrigins = new Set([
    env.CLIENT_URL.replace(/\/$/, ''),
    ...(env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean) ?? []),
  ]);

  // Only configured storefront origins may call the API from a browser.
  app.use('/api', cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin.replace(/\/$/, ''))),
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  }));
  app.use('/api', apiLimiter, requestLogger);
  // API responses are private by default; public catalogue endpoints opt in to caching themselves.
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

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
    // Hashed build files never change, so they can be cached for a year.
    app.use('/assets', express.static(path.join(frontendDist, 'assets'), { maxAge: '1y', immutable: true, index: false }));
    app.use('/assets', notFoundHandler);
    app.use(
      express.static(frontendDist, {
        maxAge: '1h',
        index: false,
        // The service worker must always be re-checked, or an old one could be stuck for an hour.
        setHeaders: (res, file) => {
          if (file.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );

    // Every other URL is a page of the app: send index.html with the metadata for that URL filled in.
    const template = readFileSync(path.join(frontendDist, 'index.html'), 'utf8');
    const SEO_BLOCK = /<!--seo-->[\s\S]*?<!--\/seo-->/;
    app.get(/.*/, async (req, res) => {
      let html = template;
      let status = 200;
      try {
        const [seo, settings] = await Promise.all([resolveSeo(req.path), getSettings()]);
        status = seo.status;
        html = template.replace(SEO_BLOCK, () => renderSeoHead(seo, settings.store.name));
      } catch (err) {
        logger.error('Could not build page metadata', err, { path: req.path });
      }
      res.status(status).setHeader('Cache-Control', 'no-cache').type('html').send(html);
    });
  }

  app.use(errorHandler);
  return app;
}
