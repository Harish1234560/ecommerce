import { Router } from 'express';
import * as order from '../controllers/order.controller.js';
import * as payment from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const orderRouter = Router();
orderRouter.use(requireAuth);
orderRouter.post('/', order.createOrder);
orderRouter.get('/', order.listOrders);
orderRouter.get('/:id', order.getOrder);
orderRouter.post('/:id/cancel', order.cancelOrder);
orderRouter.post('/:id/return', order.requestReturn);
orderRouter.get('/:id/invoice', order.downloadInvoice);

// The payment webhook is registered separately in app.ts (it needs the raw request body).
export const paymentRouter = Router();
paymentRouter.get('/config', payment.config);
paymentRouter.post('/create', requireAuth, payment.createSession);
paymentRouter.post('/verify', requireAuth, payment.verify);

export const mockGatewayRouter = Router();
mockGatewayRouter.post('/pay', requireAuth, payment.simulate);
