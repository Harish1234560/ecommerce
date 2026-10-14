import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth.js';
import * as cartService from '../services/cart.service.js';
import { ok } from '../utils/response.js';
import { cartLineSchema, couponCodeSchema, mergeCartSchema, pincodeQuerySchema, quoteSchema, updateCartItemSchema } from '../validators/cart.validators.js';
import { validate } from '../validators/common.js';

type ItemParams = { id: string };

// Every cart mutation answers with the freshly priced cart, so the client never computes totals.
async function sendCart(req: Request, res: Response, message?: string) {
  const { pincode } = validate(pincodeQuerySchema, req.query);
  ok(res, await cartService.getCart(currentUser(req).id, pincode), { message });
}

export async function quote(req: Request, res: Response) {
  ok(res, await cartService.quoteCart(validate(quoteSchema, req.body)));
}

export async function getCart(req: Request, res: Response) {
  await sendCart(req, res);
}

export async function addItem(req: Request, res: Response) {
  await cartService.addItem(currentUser(req).id, validate(cartLineSchema, req.body));
  await sendCart(req, res, 'Added to cart');
}

export async function updateItem(req: Request<ItemParams>, res: Response) {
  await cartService.updateItem(currentUser(req).id, req.params.id, validate(updateCartItemSchema, req.body));
  await sendCart(req, res, 'Cart updated');
}

export async function removeItem(req: Request<ItemParams>, res: Response) {
  await cartService.removeItem(currentUser(req).id, req.params.id);
  await sendCart(req, res, 'Removed from cart');
}

export async function clearCart(req: Request, res: Response) {
  await cartService.clearCart(currentUser(req).id);
  await sendCart(req, res, 'Cart cleared');
}

export async function applyCoupon(req: Request, res: Response) {
  const { code } = validate(couponCodeSchema, req.body);
  await cartService.applyCoupon(currentUser(req).id, code);
  await sendCart(req, res, 'Coupon applied');
}

export async function removeCoupon(req: Request, res: Response) {
  await cartService.removeCoupon(currentUser(req).id);
  await sendCart(req, res, 'Coupon removed');
}

export async function merge(req: Request, res: Response) {
  const { items } = validate(mergeCartSchema, req.body);
  await cartService.mergeGuestCart(currentUser(req).id, items);
  await sendCart(req, res, 'Cart merged');
}
