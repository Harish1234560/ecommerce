// Reviews, support tickets and image uploads (customer side).
import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth.js';
import * as reviewService from '../services/review.service.js';
import { storeImage } from '../services/storage.service.js';
import * as supportService from '../services/support.service.js';
import { badRequest } from '../utils/errors.js';
import { created, ok } from '../utils/response.js';
import { validate } from '../validators/common.js';
import { createReviewSchema, createTicketSchema, reviewSchema, ticketMessageSchema } from '../validators/engagement.validators.js';

type IdParams = { id: string };
const MAX_CUSTOMER_FILES = 4;

// ───────────────────────── Reviews ─────────────────────────

export async function myReviews(req: Request, res: Response) {
  ok(res, await reviewService.getMyReviews(currentUser(req).id));
}

export async function createReview(req: Request, res: Response) {
  const { productId, ...input } = validate(createReviewSchema, req.body);
  const review = await reviewService.createReview(currentUser(req).id, productId, input);
  created(res, { id: review.id, status: review.status }, 'Review submitted');
}

export async function updateReview(req: Request<IdParams>, res: Response) {
  await reviewService.updateReview(currentUser(req).id, req.params.id, validate(reviewSchema, req.body));
  ok(res, { id: req.params.id }, { message: 'Review updated' });
}

export async function deleteReview(req: Request<IdParams>, res: Response) {
  await reviewService.deleteReview(req.params.id, currentUser(req).id);
  ok(res, { deleted: true }, { message: 'Review deleted' });
}

// ───────────────────────── Support ─────────────────────────

// Contact form — open to guests and signed-in customers.
export async function createTicket(req: Request, res: Response) {
  created(res, await supportService.createTicket(validate(createTicketSchema, req.body), req.user), 'Support request received');
}

export async function myTickets(req: Request, res: Response) {
  ok(res, await supportService.listMyTickets(currentUser(req).id));
}

export async function getTicket(req: Request<IdParams>, res: Response) {
  ok(res, await supportService.getMyTicket(currentUser(req).id, req.params.id));
}

export async function addTicketMessage(req: Request<IdParams>, res: Response) {
  const { message } = validate(ticketMessageSchema, req.body);
  created(res, await supportService.addCustomerMessage(currentUser(req), req.params.id, message), 'Message sent');
}

// ───────────────────────── Uploads ─────────────────────────

// Signed-in users only. The file type is verified from the file's bytes and files get random names.
export async function uploadImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw badRequest('No files were uploaded');
  if (currentUser(req).role !== 'ADMIN' && files.length > MAX_CUSTOMER_FILES) throw badRequest(`You can upload up to ${MAX_CUSTOMER_FILES} images at a time`);
  const urls: string[] = [];
  for (const file of files) urls.push(await storeImage(file.buffer));
  created(res, { urls }, 'Images uploaded');
}
