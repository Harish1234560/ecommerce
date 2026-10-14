import { Prisma } from '@prisma/client';
import { TX_OPTIONS } from '../constants/index.js';
import { prisma } from '../database/prisma.js';
import { sha256 } from '../utils/crypto.js';
import { ApiError, badRequest, conflict, notFound } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { notifyOrderEvent } from './notification.service.js';
import { canPay } from './order.service.js';
import { addHistory, confirmOrderInTx, lockOrder } from './order.shared.js';
import { gateway, mockGateway, paymentFromEntity, sendMockWebhook } from './payment/gateway.js';
import { completeRefund, failRefund } from './refund.service.js';
import { getSettings } from './settings.service.js';

// Recording the outcome of online payments. Used by both the checkout verification call and the
// gateway webhook, so every function here is idempotent.

export interface ConfirmedPayment {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  amount: number;
  method?: string | null;
  reference?: string | null;
}

// Single entry point for a successful online payment — used by both the checkout verify call and
// the gateway webhook. Idempotent: the second caller sees the payment is already PAID and does nothing.
export async function confirmOnlinePayment(p: ConfirmedPayment): Promise<{ orderId: string; alreadyProcessed: boolean }> {
  const result = await prisma.$transaction(async (tx) => {
    const found = await tx.payment.findUnique({ where: { gatewayOrderId: p.gatewayOrderId }, select: { orderId: true } });
    if (!found) throw notFound('Payment');
    await lockOrder(tx, found.orderId);
    const payment = await tx.payment.findUniqueOrThrow({ where: { gatewayOrderId: p.gatewayOrderId }, include: { order: true } });
    const order = payment.order;

    if (payment.status !== 'PENDING' && payment.status !== 'FAILED') {
      return { orderId: order.id, alreadyProcessed: true, late: false };
    }
    if (p.amount !== payment.amount || payment.amount !== order.total) {
      throw new ApiError(400, 'Payment amount does not match the order total', undefined, 'AMOUNT_MISMATCH');
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        gatewayPaymentId: p.gatewayPaymentId,
        method: p.method ?? payment.method,
        reference: p.reference ?? null,
        failureReason: null,
        paidAt: new Date(),
      },
    });

    if (order.status === 'PENDING') {
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID' } });
      await confirmOrderInTx(tx, order.id, 'Payment received — order confirmed', 'system');
      return { orderId: order.id, alreadyProcessed: false, late: false };
    }

    // Money arrived for an order that is no longer awaiting payment (it expired or was cancelled): refund it.
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUND_PENDING' } });
    await tx.order.update({ where: { id: order.id }, data: { status: 'REFUND_PENDING', paymentStatus: 'REFUND_PENDING' } });
    await tx.refund.create({
      data: {
        orderId: order.id,
        paymentId: payment.id,
        userId: order.userId,
        type: 'CANCELLATION',
        status: 'APPROVED',
        amount: payment.amount,
        reason: 'Payment was received after the order had been cancelled',
      },
    });
    await addHistory(tx, order.id, 'REFUND_PENDING', 'Payment received after cancellation — refund pending', 'system');
    return { orderId: order.id, alreadyProcessed: false, late: true };
  }, TX_OPTIONS);

  if (!result.alreadyProcessed && !result.late) {
    void notifyOrderEvent(result.orderId, 'ORDER_CREATED').then(() => notifyOrderEvent(result.orderId, 'PAYMENT_SUCCESSFUL'));
  }
  return { orderId: result.orderId, alreadyProcessed: result.alreadyProcessed };
}

export async function markPaymentFailed(gatewayOrderId: string, reason: string | null) {
  await prisma.$transaction(async (tx) => {
    const found = await tx.payment.findUnique({ where: { gatewayOrderId }, select: { orderId: true } });
    if (!found) return;
    await lockOrder(tx, found.orderId);
    const payment = await tx.payment.findUniqueOrThrow({ where: { gatewayOrderId } });
    if (payment.status !== 'PENDING') return; // already paid/failed — nothing to do
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: reason?.slice(0, 300) ?? 'Payment failed' } });
    await tx.order.updateMany({ where: { id: payment.orderId, status: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
  }, TX_OPTIONS);
}

// ───────────────────────── Checkout session ─────────────────────────

export type OnlineMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

// Creates (or reuses) the gateway order for a pending shop order. The amount always comes from
// the order in the database, never from the client.
export async function createPaymentSession(userId: string, orderId: string, method?: OnlineMethod) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { payments: true, user: true } });
  if (!order) throw notFound('Order');
  if (order.paymentStatus === 'PAID') throw conflict('This order is already paid', 'ALREADY_PAID');
  if (!canPay(order)) throw conflict('This order is no longer awaiting payment', 'NOT_PAYABLE');

  const settings = await getSettings();
  if (!settings.payment.onlineEnabled) throw badRequest('Online payment is currently unavailable');

  let payment = order.payments.find((p) => p.gateway === gateway.name && p.gatewayOrderId && ['PENDING', 'FAILED'].includes(p.status));
  if (payment) {
    // A retry reuses the same gateway order.
    payment = await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PENDING', method: method ?? payment.method } });
  } else {
    const gatewayOrder = await gateway.createOrder(order.total, order.orderNumber ?? order.id, { orderId: order.id });
    payment = await prisma.payment.create({
      data: { orderId: order.id, gateway: gateway.name, gatewayOrderId: gatewayOrder.id, amount: order.total, currency: gatewayOrder.currency, method: method ?? null },
    });
  }
  if (order.paymentStatus === 'FAILED') await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PENDING' } });

  return {
    gateway: gateway.name,
    keyId: gateway.publicKey,
    gatewayOrderId: payment.gatewayOrderId,
    amount: payment.amount,
    currency: payment.currency,
    orderId: order.id,
    orderNumber: order.orderNumber,
    method: payment.method,
    storeName: settings.store.name,
    customer: { name: order.user.name, email: order.user.email, phone: order.user.phone },
  };
}

export interface CheckoutResponse {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}

// The browser reports the gateway's checkout response. Nothing in it is trusted until the signature
// is verified and the payment is re-fetched from the gateway server-to-server.
export async function verifyCheckoutPayment(userId: string, response: CheckoutResponse) {
  const payment = await prisma.payment.findUnique({ where: { gatewayOrderId: response.gatewayOrderId }, include: { order: true } });
  if (!payment || payment.order.userId !== userId) throw notFound('Payment');

  if (!gateway.verifyCheckoutSignature(response.gatewayOrderId, response.gatewayPaymentId, response.signature)) {
    throw new ApiError(400, 'Payment verification failed. If money was deducted it will be refunded automatically.', undefined, 'INVALID_SIGNATURE');
  }

  let gatewayPayment = await gateway.fetchPayment(response.gatewayPaymentId);
  if (gatewayPayment.orderId !== response.gatewayOrderId) throw new ApiError(400, 'Payment does not belong to this order', undefined, 'ORDER_MISMATCH');
  if (gatewayPayment.status === 'authorized') gatewayPayment = await gateway.capturePayment(gatewayPayment.id, payment.amount);
  if (gatewayPayment.status !== 'captured') throw new ApiError(402, 'The payment was not completed', undefined, 'PAYMENT_INCOMPLETE');

  return confirmOnlinePayment({
    gatewayOrderId: response.gatewayOrderId,
    gatewayPaymentId: gatewayPayment.id,
    amount: gatewayPayment.amount,
    method: gatewayPayment.method,
    reference: gatewayPayment.reference,
  });
}

export const paymentConfig = () => ({ gateway: gateway.name, keyId: gateway.publicKey, testMode: gateway.name === 'MOCK' });

// ───────────────────────── Webhook ─────────────────────────

type PaymentEntity = Parameters<typeof paymentFromEntity>[0] & { error_description?: string };

interface WebhookBody {
  event?: string;
  payload?: {
    payment?: { entity?: PaymentEntity };
    refund?: { entity?: { id: string; payment_id: string; amount: number; status: string } };
  };
}

export type WebhookOutcome = { status: 'processed' } | { status: 'duplicate' } | { status: 'ignored'; reason: string };

// Handles a gateway webhook. The signature is computed over the exact bytes received.
// Each event id is processed once, however many times the gateway retries it.
export async function handleGatewayWebhook(rawBody: Buffer, signature: string, headerEventId: string | undefined): Promise<WebhookOutcome> {
  if (!signature || !gateway.verifyWebhookSignature(rawBody, signature)) {
    throw new ApiError(400, 'Invalid webhook signature', undefined, 'INVALID_SIGNATURE');
  }
  let event: WebhookBody;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as WebhookBody;
  } catch {
    throw new ApiError(400, 'Malformed webhook body', undefined, 'BAD_JSON');
  }
  const type = event.event ?? 'unknown';
  const eventId = headerEventId ?? sha256(rawBody);

  try {
    await prisma.webhookEvent.create({ data: { gateway: gateway.name, eventId, type } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return { status: 'duplicate' };
    throw err;
  }

  try {
    const pay = event.payload?.payment?.entity;
    const refund = event.payload?.refund?.entity;
    if ((type === 'payment.captured' || type === 'order.paid') && pay?.order_id) {
      const gp = paymentFromEntity(pay);
      await confirmOnlinePayment({ gatewayOrderId: gp.orderId, gatewayPaymentId: gp.id, amount: gp.amount, method: gp.method, reference: gp.reference });
    } else if (type === 'payment.failed' && pay?.order_id) {
      await markPaymentFailed(pay.order_id, pay.error_description ?? null);
    } else if ((type === 'refund.processed' || type === 'refund.failed') && refund) {
      const record =
        (await prisma.refund.findUnique({ where: { gatewayRefundId: refund.id } })) ??
        (await prisma.refund.findFirst({ where: { status: 'PROCESSING', amount: refund.amount, payment: { gatewayPaymentId: refund.payment_id } } }));
      if (record) {
        if (type === 'refund.processed') await completeRefund(record.id);
        else await failRefund(record.id, 'Refund failed at the gateway');
      }
    }
    return { status: 'processed' };
  } catch (err) {
    if (err instanceof ApiError) {
      // A business-rule rejection (unknown order, amount mismatch…) will not succeed on retry.
      logger.warn(`Webhook ${type} ignored: ${err.message}`);
      return { status: 'ignored', reason: err.message };
    }
    // Unexpected failure: forget the event so the gateway's retry is processed again.
    await prisma.webhookEvent.deleteMany({ where: { gateway: gateway.name, eventId } }).catch(() => {});
    throw err;
  }
}

// ───────────────────────── Test gateway simulator ─────────────────────────

export interface MockPaymentInput {
  gatewayOrderId: string;
  method: OnlineMethod;
  outcome: 'success' | 'failure';
  skipWebhook?: boolean;
}

// Plays the role of the gateway's hosted checkout when PAYMENT_GATEWAY=mock.
export async function simulateMockPayment(userId: string, input: MockPaymentInput) {
  const payment = await prisma.payment.findUnique({ where: { gatewayOrderId: input.gatewayOrderId }, include: { order: true } });
  if (!payment || payment.order.userId !== userId) throw notFound('Payment');

  const gp = mockGateway.simulatePayment(input.gatewayOrderId, payment.amount, input.method, input.outcome === 'success');
  const entity = { id: gp.id, order_id: gp.orderId, amount: gp.amount, status: gp.status, method: gp.method ?? undefined, acquirer_data: { rrn: gp.reference ?? undefined } };

  if (input.outcome === 'failure') {
    await sendMockWebhook('payment.failed', { payment: { entity: { ...entity, error_description: 'Payment declined by the test gateway' } } });
    throw new ApiError(402, 'Payment declined by the test gateway', undefined, 'PAYMENT_FAILED');
  }
  // Like a real gateway, also confirm through a webhook shortly afterwards.
  if (!input.skipWebhook) setTimeout(() => void sendMockWebhook('payment.captured', { payment: { entity } }), 300);
  return { razorpay_order_id: gp.orderId, razorpay_payment_id: gp.id, razorpay_signature: mockGateway.sign(gp.orderId, gp.id) };
}
