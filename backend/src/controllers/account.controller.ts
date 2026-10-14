// Customer account resources: wishlist, addresses and the notification inbox.
import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth.js';
import * as addressService from '../services/address.service.js';
import * as notificationService from '../services/notification.service.js';
import * as wishlistService from '../services/wishlist.service.js';
import { created, ok, pageMeta } from '../utils/response.js';
import { addressSchema, notificationsQuerySchema, wishlistAddSchema } from '../validators/account.validators.js';
import { validate } from '../validators/common.js';

type IdParams = { id: string };
type ProductParams = { productId: string };

// ───────────────────────── Wishlist ─────────────────────────

export async function listWishlist(req: Request, res: Response) {
  ok(res, await wishlistService.listWishlist(currentUser(req).id));
}

export async function listWishlistIds(req: Request, res: Response) {
  ok(res, await wishlistService.listWishlistProductIds(currentUser(req).id));
}

export async function addToWishlist(req: Request, res: Response) {
  const { productId } = validate(wishlistAddSchema, req.body);
  await wishlistService.addToWishlist(currentUser(req).id, productId);
  created(res, { productId, wishlisted: true }, 'Saved to wishlist');
}

export async function removeFromWishlist(req: Request<ProductParams>, res: Response) {
  await wishlistService.removeFromWishlist(currentUser(req).id, req.params.productId);
  ok(res, { productId: req.params.productId, wishlisted: false }, { message: 'Removed from wishlist' });
}

export async function moveWishlistItemToCart(req: Request<ProductParams>, res: Response) {
  await wishlistService.moveToCart(currentUser(req).id, req.params.productId);
  ok(res, { moved: true }, { message: 'Moved to cart' });
}

// ───────────────────────── Addresses ─────────────────────────

export async function listAddresses(req: Request, res: Response) {
  ok(res, await addressService.listAddresses(currentUser(req).id));
}

export async function createAddress(req: Request, res: Response) {
  created(res, await addressService.createAddress(currentUser(req).id, validate(addressSchema, req.body)), 'Address added');
}

export async function updateAddress(req: Request<IdParams>, res: Response) {
  const address = await addressService.updateAddress(currentUser(req).id, req.params.id, validate(addressSchema, req.body));
  ok(res, address, { message: 'Address updated' });
}

export async function setDefaultAddress(req: Request<IdParams>, res: Response) {
  await addressService.setDefaultAddress(currentUser(req).id, req.params.id);
  ok(res, { id: req.params.id, isDefault: true }, { message: 'Default address updated' });
}

export async function deleteAddress(req: Request<IdParams>, res: Response) {
  await addressService.deleteAddress(currentUser(req).id, req.params.id);
  ok(res, { deleted: true }, { message: 'Address deleted' });
}

// ───────────────────────── Notifications ─────────────────────────

export async function listNotifications(req: Request, res: Response) {
  const q = validate(notificationsQuerySchema, req.query);
  const { items, total, unreadCount } = await notificationService.listNotifications(currentUser(req).id, { page: q.page, limit: q.limit, unreadOnly: q.unread === 'true' });
  ok(res, items, { meta: { ...pageMeta(total, q.page, q.limit), unreadCount } });
}

export async function unreadCount(req: Request, res: Response) {
  ok(res, { count: await notificationService.countUnread(currentUser(req).id) });
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  await notificationService.markAllRead(currentUser(req).id);
  ok(res, { read: true }, { message: 'All notifications marked as read' });
}

export async function markNotificationRead(req: Request<IdParams>, res: Response) {
  await notificationService.markRead(currentUser(req).id, req.params.id);
  ok(res, { read: true });
}

export async function deleteNotification(req: Request<IdParams>, res: Response) {
  await notificationService.deleteNotification(currentUser(req).id, req.params.id);
  ok(res, { deleted: true }, { message: 'Notification deleted' });
}
