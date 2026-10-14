import type { Request, Response } from 'express';
import * as catalogService from '../services/catalog.service.js';
import * as storefrontService from '../services/storefront.service.js';
import { ok, pageMeta } from '../utils/response.js';
import { deliveryCheckSchema, newsletterSchema, productQuerySchema, productReviewsQuerySchema, suggestSchema } from '../validators/catalog.validators.js';
import { validate } from '../validators/common.js';

// Public, read-mostly storefront endpoints.

export async function listProducts(req: Request, res: Response) {
  const query = validate(productQuerySchema, req.query);
  const { items, total, facets } = await catalogService.listProducts(query);
  ok(res, items, { meta: { ...pageMeta(total, query.page, query.limit), facets } });
}

export async function suggestProducts(req: Request, res: Response) {
  const { q } = validate(suggestSchema, req.query);
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
  ok(res, await catalogService.listCategories());
}

export async function getCategory(req: Request<{ slug: string }>, res: Response) {
  ok(res, await catalogService.getCategoryBySlug(req.params.slug));
}

export async function home(_req: Request, res: Response) {
  ok(res, await storefrontService.getHome());
}

export async function offers(_req: Request, res: Response) {
  ok(res, await storefrontService.getOffers());
}

export async function contentPage(req: Request<{ slug: string }>, res: Response) {
  ok(res, await storefrontService.getContentPage(req.params.slug));
}

export async function publicSettings(_req: Request, res: Response) {
  ok(res, await storefrontService.getPublicSettings());
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
