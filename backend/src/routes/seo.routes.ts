import { Router } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import { visibleProduct } from '../services/catalog.service.js';

// robots.txt and a sitemap generated from the live catalogue.
const router = Router();
const base = env.CLIENT_URL.replace(/\/$/, '');
const STATIC_PATHS = ['/', '/products', '/offers', '/about', '/contact', '/return-policy', '/shipping-policy', '/privacy', '/terms'];

router.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /account', 'Disallow: /checkout', 'Disallow: /cart', 'Disallow: /api/', '', `Sitemap: ${base}/sitemap.xml`, ''].join('\n'),
  );
});

router.get('/sitemap.xml', async (_req, res) => {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: visibleProduct, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 5000 }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const url = (path: string, lastmod?: Date) => `  <url><loc>${base}${path}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...STATIC_PATHS.map((p) => url(p)),
    ...categories.map((c) => url(`/category/${c.slug}`, c.updatedAt)),
    ...products.map((p) => url(`/product/${p.slug}`, p.updatedAt)),
    '</urlset>',
  ].join('\n');
  res.type('application/xml').send(xml);
});

export default router;
