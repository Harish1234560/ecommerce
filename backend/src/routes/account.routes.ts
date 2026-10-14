import { Router } from 'express';
import * as account from '../controllers/account.controller.js';
import { requireAuth } from '../middleware/auth.js';

// All of these belong to the signed-in customer.
export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);
wishlistRouter.get('/', account.listWishlist);
wishlistRouter.get('/ids', account.listWishlistIds);
wishlistRouter.post('/', account.addToWishlist);
wishlistRouter.delete('/:productId', account.removeFromWishlist);
wishlistRouter.post('/:productId/move-to-cart', account.moveWishlistItemToCart);

export const addressRouter = Router();
addressRouter.use(requireAuth);
addressRouter.get('/', account.listAddresses);
addressRouter.post('/', account.createAddress);
addressRouter.put('/:id', account.updateAddress);
addressRouter.patch('/:id/default', account.setDefaultAddress);
addressRouter.delete('/:id', account.deleteAddress);

export const notificationRouter = Router();
notificationRouter.use(requireAuth);
notificationRouter.get('/', account.listNotifications);
notificationRouter.get('/unread-count', account.unreadCount);
notificationRouter.post('/read-all', account.markAllNotificationsRead);
notificationRouter.patch('/:id/read', account.markNotificationRead);
notificationRouter.delete('/:id', account.deleteNotification);
