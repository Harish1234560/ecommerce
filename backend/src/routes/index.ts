import { Router } from 'express';
import { env } from '../config/env.js';
import { notFoundHandler } from '../middleware/error.js';
import { addressRouter, notificationRouter, wishlistRouter } from './account.routes.js';
import adminRouter from './admin.routes.js';
import authRouter from './auth.routes.js';
import cartRouter from './cart.routes.js';
import catalogRouter from './catalog.routes.js';
import { reviewRouter, supportRouter, uploadRouter } from './engagement.routes.js';
import { mockGatewayRouter, orderRouter, paymentRouter } from './order.routes.js';

// Version 1 of the REST API, mounted at /api/v1.
const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'OK', data: { status: 'ok', time: new Date().toISOString() } });
});

router.use('/auth', authRouter);
router.use('/cart', cartRouter);
router.use('/wishlist', wishlistRouter);
router.use('/addresses', addressRouter);
router.use('/notifications', notificationRouter);
router.use('/orders', orderRouter);
router.use('/payments', paymentRouter);
if (env.PAYMENT_GATEWAY === 'mock') router.use('/mock-gateway', mockGatewayRouter);
router.use('/reviews', reviewRouter);
router.use('/support', supportRouter);
router.use('/uploads', uploadRouter);
router.use('/admin', adminRouter);
router.use('/', catalogRouter); // products, categories, home, offers, content, settings, delivery, newsletter
router.use(notFoundHandler);

export default router;
