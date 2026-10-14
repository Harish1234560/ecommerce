import type { Order } from '@prisma/client';
import { TX_OPTIONS } from '../constants/index.js';
import { prisma } from '../database/prisma.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { notifyOrderEvent } from './notification.service.js';
import { addHistory, lockOrder } from './order.shared.js';
import { gateway } from './payment/gateway.js';
import { getSettings } from './settings.service.js';

// Returns and refunds. A gateway refund is only marked completed when the gateway confirms it.

export async function isReturnable(order: Pick<Order, 'status' | 'deliveredAt'>): Promise<boolean> {
  if (order.status !== 'DELIVERED' || !order.deliveredAt) return false;
  const { policies } = await getSettings();
  return Date.now() - order.deliveredAt.getTime() <= policies.returnWindowDays * 86_400_000;
}

export async function requestReturn(orderId: string, userId: string, input: { items?: { orderItemId: string; quantity: number }[]; reason: string }) {
  const refund = await prisma.$transaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await tx.order.findFirst({ where: { id: orderId, userId }, include: { items: true, payments: true, refunds: true } });
    if (!order) throw notFound('Order');
    if (!(await isReturnable(order))) throw conflict('This order is not eligible for return', 'NOT_RETURNABLE');
    if (order.refunds.some((r) => ['REQUESTED', 'APPROVED', 'PROCESSING'].includes(r.status))) {
      throw conflict('A return for this order is already in progress');
    }

    const requested = input.items?.length
      ? input.items
      : order.items.filter((i) => i.quantity - i.returnedQty > 0).map((i) => ({ orderItemId: i.id, quantity: i.quantity - i.returnedQty }));
    if (requested.length === 0) throw badRequest('There is nothing left to return on this order');

    let amount = 0;
    for (const line of requested) {
      const item = order.items.find((i) => i.id === line.orderItemId);
      if (!item) throw badRequest('Invalid item in return request');
      if (line.quantity < 1 || line.quantity > item.quantity - item.returnedQty) throw badRequest(`Invalid return quantity for ${item.name}`);
      amount += Math.round((item.netAmount * line.quantity) / item.quantity);
    }

    const payment = order.payments.find((p) => ['PAID', 'PARTIALLY_REFUNDED'].includes(p.status));
    const created = await tx.refund.create({
      data: { orderId, paymentId: payment?.id ?? null, userId, type: 'RETURN', status: 'REQUESTED', amount, reason: input.reason, items: requested },
    });
    await tx.order.update({ where: { id: orderId }, data: { status: 'RETURN_REQUESTED' } });
    await addHistory(tx, orderId, 'RETURN_REQUESTED', input.reason, 'customer');
    return created;
  }, TX_OPTIONS);
  void notifyOrderEvent(orderId, 'RETURN_REQUESTED');
  return refund;
}

export async function decideReturn(refundId: string, approve: boolean, adminNote?: string) {
  const refund = await prisma.$transaction(async (tx) => {
    const found = await tx.refund.findUnique({ where: { id: refundId } });
    if (!found) throw notFound('Refund request');
    await lockOrder(tx, found.orderId);
    const current = await tx.refund.findUniqueOrThrow({ where: { id: refundId } });
    if (current.status !== 'REQUESTED') throw conflict('This request has already been reviewed');
    if (approve) {
      await tx.order.update({ where: { id: current.orderId }, data: { status: 'RETURN_APPROVED' } });
      await addHistory(tx, current.orderId, 'RETURN_APPROVED', adminNote ?? 'Return approved', 'admin');
    } else {
      await tx.order.update({ where: { id: current.orderId }, data: { status: 'DELIVERED' } });
      await addHistory(tx, current.orderId, 'DELIVERED', `Return request declined${adminNote ? `: ${adminNote}` : ''}`, 'admin');
    }
    return tx.refund.update({ where: { id: refundId }, data: { status: approve ? 'APPROVED' : 'REJECTED', adminNote: adminNote ?? null } });
  }, TX_OPTIONS);
  void notifyOrderEvent(refund.orderId, approve ? 'RETURN_APPROVED' : 'RETURN_REJECTED', { reason: adminNote });
  return refund;
}

// Marks a refund as completed and settles the payment and order. Idempotent.
export async function completeRefund(refundId: string, reference?: string | null) {
  const done = await prisma.$transaction(async (tx) => {
    const found = await tx.refund.findUnique({ where: { id: refundId } });
    if (!found) throw notFound('Refund');
    await lockOrder(tx, found.orderId);
    const refund = await tx.refund.findUniqueOrThrow({ where: { id: refundId }, include: { payment: true } });
    if (refund.status === 'COMPLETED') return null;
    if (refund.status !== 'PROCESSING') throw conflict('This refund is not being processed');

    await tx.refund.update({ where: { id: refundId }, data: { status: 'COMPLETED', completedAt: new Date(), reference: reference ?? refund.reference } });
    let paymentStatus: 'REFUNDED' | 'PARTIALLY_REFUNDED' = 'REFUNDED';
    if (refund.payment) {
      const refundedAmount = refund.payment.refundedAmount + refund.amount;
      paymentStatus = refundedAmount >= refund.payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      await tx.payment.update({ where: { id: refund.payment.id }, data: { refundedAmount, status: paymentStatus } });
    }
    await tx.order.update({ where: { id: refund.orderId }, data: { status: 'REFUNDED', paymentStatus } });
    await addHistory(tx, refund.orderId, 'REFUNDED', `Refund of ₹${(refund.amount / 100).toFixed(2)} completed`, 'system');
    return refund;
  }, TX_OPTIONS);
  if (done) void notifyOrderEvent(done.orderId, 'REFUND_COMPLETED', { refundAmount: done.amount });
}

export async function failRefund(refundId: string, reason: string) {
  const refund = await prisma.refund.findUnique({ where: { id: refundId } });
  if (!refund || refund.status !== 'PROCESSING') return;
  await prisma.refund.update({ where: { id: refundId }, data: { status: 'FAILED', adminNote: `Gateway: ${reason}`.slice(0, 300) } });
  void notifyOrderEvent(refund.orderId, 'REFUND_FAILED');
}

// Sends an approved refund to the payment gateway, or records a manual refund (COD / bank transfer).
// A gateway refund is only marked completed when the gateway confirms it (immediately or by webhook).
export async function processRefund(refundId: string, manualReference?: string) {
  const refund = await prisma.refund.findUnique({ where: { id: refundId }, include: { payment: true, order: true } });
  if (!refund) throw notFound('Refund');
  if (refund.order.status !== 'REFUND_PENDING') {
    throw conflict(refund.type === 'RETURN' ? 'Mark the returned items as received before refunding' : 'This order is not awaiting a refund');
  }
  const viaGateway = !!refund.payment && refund.payment.gateway !== 'COD' && !!refund.payment.gatewayPaymentId;
  if (!viaGateway && !manualReference?.trim()) {
    throw badRequest('Enter the transaction reference of the manual refund (bank transfer / UPI)');
  }

  // Claim the refund so two admins (or a double click) cannot send it twice.
  const claimed = await prisma.refund.updateMany({
    where: { id: refundId, status: { in: ['APPROVED', 'FAILED'] } },
    data: { status: 'PROCESSING', processedAt: new Date() },
  });
  if (claimed.count === 0) throw conflict('This refund is already being processed or is not approved');

  if (!viaGateway) {
    await completeRefund(refundId, manualReference!.trim());
    return prisma.refund.findUniqueOrThrow({ where: { id: refundId } });
  }

  try {
    const result = await gateway.createRefund(refund.payment!.gatewayPaymentId!, refund.amount, {
      refundId: refund.id,
      orderNumber: refund.order.orderNumber ?? refund.orderId,
    });
    await prisma.refund.update({ where: { id: refundId }, data: { gatewayRefundId: result.id } });
    void notifyOrderEvent(refund.orderId, 'REFUND_INITIATED', { refundAmount: refund.amount });
    if (result.status === 'processed') await completeRefund(refundId);
    if (result.status === 'failed') await failRefund(refundId, 'Refund was declined by the gateway');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gateway error';
    await prisma.refund.update({ where: { id: refundId }, data: { status: 'FAILED', adminNote: message.slice(0, 300) } });
    throw err;
  }
  return prisma.refund.findUniqueOrThrow({ where: { id: refundId } });
}
