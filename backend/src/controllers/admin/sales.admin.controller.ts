// Admin: dashboard & analytics, orders, customers, payments and refunds.
import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth.js';
import * as analyticsService from '../../services/admin/analytics.admin.service.js';
import * as salesService from '../../services/admin/sales.admin.service.js';
import { audit } from '../../services/audit.service.js';
import { streamInvoice } from '../../services/invoice.service.js';
import * as orderService from '../../services/order.service.js';
import * as refundService from '../../services/refund.service.js';
import { ok, pageMeta } from '../../utils/response.js';
import {
  adminOrdersQuerySchema, analyticsRangeSchema, customersQuerySchema, customerStatusSchema, paymentsQuerySchema, refundApproveSchema, refundProcessSchema, refundRejectSchema, refundsQuerySchema,
} from '../../validators/adminSales.validators.js';
import { validate } from '../../validators/common.js';
import { adminStatusUpdateSchema } from '../../validators/order.validators.js';

type IdParams = { id: string };
const adminId = (req: Request) => currentUser(req).id;

// ───────────────────────── Dashboard & analytics ─────────────────────────

export async function dashboard(req: Request, res: Response) {
  ok(res, await analyticsService.getDashboard(validate(analyticsRangeSchema, req.query)));
}

export async function analytics(req: Request, res: Response) {
  ok(res, await analyticsService.getAnalytics(validate(analyticsRangeSchema, req.query)));
}

// ───────────────────────── Orders ─────────────────────────

export async function listOrders(req: Request, res: Response) {
  const q = validate(adminOrdersQuerySchema, req.query);
  const { items, total, statusCounts } = await salesService.listOrders(q);
  ok(res, items, { meta: { ...pageMeta(total, q.page, q.limit), statusCounts } });
}

export async function getOrder(req: Request<IdParams>, res: Response) {
  ok(res, await salesService.getOrder(req.params.id));
}

export async function updateOrderStatus(req: Request<IdParams>, res: Response) {
  const update = validate(adminStatusUpdateSchema, req.body);
  const order = await salesService.getOrderSummary(req.params.id);
  await orderService.adminUpdateStatus(order.id, update);
  await audit(adminId(req), 'order.status', 'Order', order.id, { orderNumber: order.orderNumber, from: order.status, to: update.status, note: update.note });
  ok(res, { id: order.id, status: update.status }, { message: 'Order updated' });
}

export async function orderInvoice(req: Request<IdParams>, res: Response) {
  await streamInvoice(await orderService.getOrderForInvoice(req.params.id), res);
}

// ───────────────────────── Customers ─────────────────────────

export async function listCustomers(req: Request, res: Response) {
  const q = validate(customersQuerySchema, req.query);
  const { items, total } = await salesService.listCustomers(q);
  ok(res, items, { meta: pageMeta(total, q.page, q.limit) });
}

export async function getCustomer(req: Request<IdParams>, res: Response) {
  ok(res, await salesService.getCustomer(req.params.id));
}

export async function setCustomerStatus(req: Request<IdParams>, res: Response) {
  const { isActive } = validate(customerStatusSchema, req.body);
  const customer = await salesService.setCustomerActive(req.params.id, isActive);
  await audit(adminId(req), isActive ? 'customer.enable' : 'customer.disable', 'User', customer.id, { email: customer.email });
  ok(res, { id: customer.id, isActive }, { message: isActive ? 'Account enabled' : 'Account disabled' });
}

// ───────────────────────── Payments ─────────────────────────

export async function listPayments(req: Request, res: Response) {
  const q = validate(paymentsQuerySchema, req.query);
  const { items, total, summary } = await salesService.listPayments(q);
  ok(res, items, { meta: { ...pageMeta(total, q.page, q.limit), summary } });
}

// ───────────────────────── Refunds ─────────────────────────

export async function listRefunds(req: Request, res: Response) {
  const q = validate(refundsQuerySchema, req.query);
  const { items, total, summary } = await salesService.listRefunds(q);
  ok(res, items, { meta: { ...pageMeta(total, q.page, q.limit), summary } });
}

export async function approveRefund(req: Request<IdParams>, res: Response) {
  const { note } = validate(refundApproveSchema, req.body ?? {});
  const refund = await refundService.decideReturn(req.params.id, true, note);
  await audit(adminId(req), 'refund.approve', 'Refund', refund.id, { orderId: refund.orderId, amount: refund.amount });
  ok(res, { id: refund.id, status: refund.status }, { message: 'Return approved' });
}

export async function rejectRefund(req: Request<IdParams>, res: Response) {
  const { note } = validate(refundRejectSchema, req.body);
  const refund = await refundService.decideReturn(req.params.id, false, note);
  await audit(adminId(req), 'refund.reject', 'Refund', refund.id, { orderId: refund.orderId, note });
  ok(res, { id: refund.id, status: refund.status }, { message: 'Return rejected' });
}

export async function markReturnReceived(req: Request<IdParams>, res: Response) {
  const refund = await salesService.markReturnReceived(req.params.id);
  await audit(adminId(req), 'refund.items_received', 'Refund', refund.id, { orderId: refund.orderId });
  ok(res, { id: refund.id }, { message: 'Items received' });
}

// Sends the refund to the gateway, or records a manual refund. It is only "completed" once confirmed.
export async function processRefund(req: Request<IdParams>, res: Response) {
  const { reference } = validate(refundProcessSchema, req.body ?? {});
  const refund = await refundService.processRefund(req.params.id, reference);
  await audit(adminId(req), 'refund.process', 'Refund', refund.id, { orderId: refund.orderId, amount: refund.amount, status: refund.status });
  ok(res, { id: refund.id, status: refund.status }, { message: refund.status === 'COMPLETED' ? 'Refund completed' : 'Refund initiated' });
}
