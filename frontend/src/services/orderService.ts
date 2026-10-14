import { api, type PageMeta } from '@/api/client';
import type { GatewayCheckoutResponse, OnlineMethod, OrderDetail, OrderListItem, PaymentSession, PlacedOrder } from '@/types';

export const orderService = {
  // The idempotency key makes a retried "Place order" return the same order instead of a duplicate.
  place: (input: { addressId: string; paymentMethod: 'COD' | 'ONLINE' }, idempotencyKey: string) => api.post<PlacedOrder>('/orders', input, { 'Idempotency-Key': idempotencyKey }),
  list: (query: { status?: string; page: number; limit: number }) => api.getPaged<OrderListItem[], PageMeta>('/orders', query),
  get: (id: string) => api.get<OrderDetail>(`/orders/${id}`),
  cancel: (id: string, reason: string) => api.post<void>(`/orders/${id}/cancel`, { reason }),
  requestReturn: (id: string, input: { reason: string; items: { orderItemId: string; quantity: number }[] }) => api.post<void>(`/orders/${id}/return`, input),
  downloadInvoice: (id: string, orderNumber: string) => api.download(`/orders/${id}/invoice`, `invoice-${orderNumber}.pdf`),
};

export const paymentService = {
  createSession: (orderId: string, method: OnlineMethod) => api.post<PaymentSession>('/payments/create', { orderId, method }),
  // The server verifies the gateway signature; the browser's "success" is never trusted on its own.
  verify: (response: GatewayCheckoutResponse) => api.post<{ orderId: string; verified: boolean }>('/payments/verify', response),
  // Test gateway only: simulates the customer paying (or the payment being declined).
  simulate: (input: { gatewayOrderId: string; method: OnlineMethod; outcome: 'success' | 'failure' }) => api.post<GatewayCheckoutResponse>('/mock-gateway/pay', input),
};
