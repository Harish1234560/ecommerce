import { z } from 'zod';
import { ORDER_STATUSES } from '../constants/index.js';
import { idSchema, pageSchema } from './common.js';

export const createOrderSchema = z.object({
  addressId: z.string().min(1, 'Select a delivery address').max(40),
  paymentMethod: z.enum(['COD', 'ONLINE']),
  notes: z.string().trim().max(300).optional(),
});

export const customerOrdersQuerySchema = pageSchema.extend({ status: z.string().max(20).optional() });

export const cancelOrderSchema = z.object({ reason: z.string().trim().min(3, 'Tell us why you are cancelling').max(300) });

export const returnRequestSchema = z.object({
  reason: z.string().trim().min(5, 'Tell us why you are returning this').max(500),
  items: z.array(z.object({ orderItemId: idSchema, quantity: z.coerce.number().int().min(1).max(100) })).max(50).optional(),
});

const onlineMethod = z.enum(['upi', 'card', 'netbanking', 'wallet']);

export const paymentSessionSchema = z.object({ orderId: idSchema, method: onlineMethod.optional() });

// Field names follow the Razorpay checkout response.
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

export const mockPaymentSchema = z.object({
  gatewayOrderId: z.string().min(1).max(100),
  method: onlineMethod.default('upi'),
  outcome: z.enum(['success', 'failure']),
  skipWebhook: z.boolean().optional(),
});

// Admin
export const adminStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).optional(),
  courier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(60).optional(),
});
