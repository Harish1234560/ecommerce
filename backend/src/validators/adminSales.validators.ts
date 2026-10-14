import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_STATUSES, REFUND_STATUSES } from '../constants/index.js';
import { idSchema, pageSchema, zDateRange } from './common.js';

const search = z.string().trim().max(100).optional();

export const adminOrdersQuerySchema = pageSchema.extend({
  q: search,
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  method: z.enum(['COD', 'ONLINE']).optional(),
  customerId: idSchema.optional(),
  ...zDateRange,
});
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;

export const customersQuerySchema = pageSchema.extend({ q: search, status: z.enum(['active', 'disabled']).optional() });
export type CustomersQuery = z.infer<typeof customersQuerySchema>;

export const customerStatusSchema = z.object({ isActive: z.boolean() });

export const paymentsQuerySchema = pageSchema.extend({
  q: search,
  status: z.enum(PAYMENT_STATUSES).optional(),
  method: z.string().trim().max(20).optional(),
  ...zDateRange,
});
export type PaymentsQuery = z.infer<typeof paymentsQuerySchema>;

export const refundsQuerySchema = pageSchema.extend({
  status: z.enum(REFUND_STATUSES).optional(),
  type: z.enum(['CANCELLATION', 'RETURN']).optional(),
});
export type RefundsQuery = z.infer<typeof refundsQuerySchema>;

export const refundApproveSchema = z.object({ note: z.string().trim().max(300).optional() });
export const refundRejectSchema = z.object({ note: z.string().trim().min(3, 'Give the customer a reason').max(300) });
export const refundProcessSchema = z.object({ reference: z.string().trim().max(100).optional() });

export const analyticsRangeSchema = z.object({
  range: z.enum(['today', '7d', '30d', 'year', 'custom']).default('30d'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;
