import type { Request, Response } from 'express';
import * as catalogService from '../services/catalog.service.js';
import * as storefrontService from '../services/storefront.service.js';
import { cached } from '../utils/cache.js';
import { ok, pageMeta, publicCache } from '../utils/response.js';
import { deliveryCheckSchema, newsletterSchema, productQuerySchema, productReviewsQuerySchema, suggestSchema } from '../validators/catalog.validators.js';
import { validate } from '../validators/common.js';

// Public, read-mostly storefront endpoints. None of these responses depend on who is asking, so
// they may be cached briefly by browsers and the server (see utils/cache.ts).

export async function listProducts(req: Request, res: Response) {
  const query = validate(productQuerySchema, req.query);
  const { items, total, facets } = await catalogService.listProducts(query);
  publicCache(res, 30);
  ok(res, items, { meta: { ...pageMeta(total, query.page, query.limit), facets } });
}

export async function suggestProducts(req: Request, res: Response) {
  const { q } = validate(suggestSchema, req.query);
  publicCache(res, 60);
  ok(res, await catalogService.suggestProducts(q));
}

export async function getProduct(req: Request<{ slug: string }>, res: Response) {
  ok(res, await catalogService.getProductBySlug(req.params.slug));
}

export async function listProductReviews(req: Request<{ slug: string }>, res: Response) {
  const query = validate(productReviewsQuerySchema, req.query);
  const { items, total } = await catalogService.listProductReviews(req.params.slug, query);
  ok(res, items, { meta: pageMeta(total, query.page, query.limit) });
}

export async function listCategories(_req: Request, res: Response) {
  publicCache(res, 60);
  ok(res, await cached('categories', catalogService.listCategories));
}

export async function getCategory(req: Request<{ slug: string }>, res: Response) {
  ok(res, await catalogService.getCategoryBySlug(req.params.slug));
}

export async function home(_req: Request, res: Response) {
  publicCache(res, 30);
  ok(res, await cached('home', storefrontService.getHome));
}

export async function offers(_req: Request, res: Response) {
  publicCache(res, 30);
  ok(res, await cached('offers', storefrontService.getOffers));
}

export async function contentPage(req: Request<{ slug: string }>, res: Response) {
  const { slug } = req.params;
  publicCache(res, 60);
  ok(res, await cached(`content:${slug}`, () => storefrontService.getContentPage(slug)));
}

export async function publicSettings(_req: Request, res: Response) {
  publicCache(res, 60);
  ok(res, await cached('settings', storefrontService.getPublicSettings));
}

export async function popularSearches(_req: Request, res: Response) {
  publicCache(res, 300);
  ok(res, await cached('popular-searches', () => catalogService.popularSearches(), 10 * 60_000));
}

export async function checkDelivery(req: Request, res: Response) {
  const { pincode } = validate(deliveryCheckSchema, req.query);
  ok(res, await storefrontService.checkDelivery(pincode));
}

export async function subscribeNewsletter(req: Request, res: Response) {
  const { email } = validate(newsletterSchema, req.body);
  await storefrontService.subscribeNewsletter(email);
  ok(res, { subscribed: true }, { message: 'Subscribed to the newsletter' });
}
