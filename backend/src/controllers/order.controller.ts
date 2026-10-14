import type { Request, Response } from 'express';
import { CUSTOMER_ORDER_GROUPS } from '../constants/index.js';
import { currentUser } from '../middleware/auth.js';
import { streamInvoice } from '../services/invoice.service.js';
import * as orderService from '../services/order.service.js';
import * as refundService from '../services/refund.service.js';
import { created, ok, pageMeta } from '../utils/response.js';
import { validate } from '../validators/common.js';
import { cancelOrderSchema, createOrderSchema, customerOrdersQuerySchema, returnRequestSchema } from '../validators/order.validators.js';

type IdParams = { id: string };

// Places an order from the cart. An Idempotency-Key header makes a retried request return the same order.
export async function createOrder(req: Request, res: Response) {
  const input = validate(createOrderSchema, req.body);
  const idempotencyKey = req.header('Idempotency-Key')?.slice(0, 80) || undefined;
  const order = await orderService.createOrder(currentUser(req).id, { ...input, idempotencyKey });
  created(
    res,
    { id: order.id, orderNumber: order.orderNumber, total: order.total, status: order.status, paymentMethod: order.paymentMethod, requiresPayment: orderService.canPay(order) },
    'Order placed',
  );
}

export async function listOrders(req: Request, res: Response) {
  const q = validate(customerOrdersQuerySchema, req.query);
  const statuses = q.status ? CUSTOMER_ORDER_GROUPS[q.status] : undefined;
  const { items, total } = await orderService.listCustomerOrders(currentUser(req).id, { page: q.page, limit: q.limit, statuses });
  ok(res, items, { meta: pageMeta(total, q.page, q.limit) });
}

export async function getOrder(req: Request<IdParams>, res: Response) {
  ok(res, await orderService.getCustomerOrder(currentUser(req).id, req.params.id));
}

export async function cancelOrder(req: Request<IdParams>, res: Response) {
  const { reason } = validate(cancelOrderSchema, req.body);
  await orderService.cancelCustomerOrder(currentUser(req).id, req.params.id, reason);
  ok(res, { cancelled: true }, { message: 'Order cancelled' });
}

export async function requestReturn(req: Request<IdParams>, res: Response) {
  const refund = await refundService.requestReturn(req.params.id, currentUser(req).id, validate(returnRequestSchema, req.body));
  created(res, { id: refund.id, status: refund.status, amount: refund.amount }, 'Return requested');
}

export async function downloadInvoice(req: Request<IdParams>, res: Response) {
  const order = await orderService.getOrderForInvoice(req.params.id, currentUser(req).id);
  await streamInvoice(order, res);
}
