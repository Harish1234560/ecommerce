import type { OrderStatus } from '@prisma/client';

export const API_PREFIX = '/api/v1';

// Auth
export const REFRESH_COOKIE = 'sh_refresh';
export const RESET_TOKEN_MINUTES = 30;
export const BCRYPT_ROUNDS = 12;

// Cart & catalogue limits
export const MAX_QTY_PER_ITEM = 10;
export const MAX_SAVED_ADDRESSES = 10;
export const LOW_STOCK_LIST_THRESHOLD = 10;

// Database transactions that touch several rows (orders, stock) get a generous timeout.
export const TX_OPTIONS = { timeout: 20_000, maxWait: 10_000 } as const;

export type Actor = 'customer' | 'admin' | 'system';

export const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED',
  'CANCELLED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED', 'REFUND_PENDING', 'REFUNDED',
] as const satisfies readonly OrderStatus[];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED'] as const;
export const REFUND_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

// Who may cancel an order, and until which stage.
export const CANCELLABLE_BY: Record<Actor, OrderStatus[]> = {
  customer: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'],
  admin: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'],
  system: ['PENDING'],
};

// Status changes an admin may make from each state.
export const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'PACKED', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: [],
  RETURN_APPROVED: ['RETURNED'],
  RETURNED: [],
  REFUND_PENDING: [],
  REFUNDED: [],
};

// The filter tabs on the customer's "My orders" page.
export const CUSTOMER_ORDER_GROUPS: Record<string, OrderStatus[]> = {
  processing: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'],
  shipped: ['SHIPPED', 'OUT_FOR_DELIVERY'],
  delivered: ['DELIVERED'],
  cancelled: ['CANCELLED'],
  returned: ['RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED'],
  refunded: ['REFUND_PENDING', 'REFUNDED'],
};

export const ticketNumber = (seq: number) => `TKT-${1000 + seq}`;
