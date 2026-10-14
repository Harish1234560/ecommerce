import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth.js';
import * as paymentService from '../services/payment.service.js';
import { ok } from '../utils/response.js';
import { validate } from '../validators/common.js';
import { mockPaymentSchema, paymentSessionSchema, verifyPaymentSchema } from '../validators/order.validators.js';

export function config(_req: Request, res: Response) {
  ok(res, paymentService.paymentConfig());
}

// Step 2 of online checkout: open a gateway order for a pending shop order.
export async function createSession(req: Request, res: Response) {
  const { orderId, method } = validate(paymentSessionSchema, req.body);
  ok(res, await paymentService.createPaymentSession(currentUser(req).id, orderId, method), { message: 'Payment session created' });
}

// Step 3: verify the gateway's checkout response on the server.
export async function verify(req: Request, res: Response) {
  const body = validate(verifyPaymentSchema, req.body);
  const result = await paymentService.verifyCheckoutPayment(currentUser(req).id, {
    gatewayOrderId: body.razorpay_order_id,
    gatewayPaymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  });
  ok(res, { orderId: result.orderId, verified: true }, { message: 'Payment verified' });
}

// Gateway → server. Mounted with a raw body parser because the signature covers the exact bytes.
export async function webhook(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const outcome = await paymentService.handleGatewayWebhook(rawBody, req.header('x-razorpay-signature') ?? '', req.header('x-razorpay-event-id'));
  ok(res, outcome, { message: `Webhook ${outcome.status}` });
}

// Test gateway simulator (only routed when PAYMENT_GATEWAY=mock).
export async function simulate(req: Request, res: Response) {
  const input = validate(mockPaymentSchema, req.body);
  ok(res, await paymentService.simulateMockPayment(currentUser(req).id, input));
}
