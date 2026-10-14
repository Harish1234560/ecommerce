import { Prisma, type Order, type OrderStatus, type PaymentMethod } from '@prisma/client';
import { ADMIN_TRANSITIONS, CANCELLABLE_BY, TX_OPTIONS, type Actor } from '../constants/index.js';
import { prisma, type Tx } from '../database/prisma.js';
import { ApiError, badRequest, conflict, notFound } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { findInventoryId, releaseStock, reserveStock, restoreStock } from './inventory.service.js';
import { notifyOrderEvent } from './notification.service.js';
import { addHistory, confirmOrderInTx, lockOrder } from './order.shared.js';
import { priceCart } from './pricing.service.js';
import { isReturnable } from './refund.service.js';
import { getSettings } from './settings.service.js';
import { addDays } from './shipping.service.js';

// Order lifecycle: placing an order, cancelling it, and the admin's fulfilment steps.

// ───────────────────────── Create ─────────────────────────

export interface CreateOrderInput {
  addressId: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  idempotencyKey?: string;
}

export async function createOrder(userId: string, input: CreateOrderInput): Promise<Order> {
  if (input.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
    });
    if (existing) return existing;
  }

  const settings = await getSettings();
  const address = await prisma.address.findFirst({ where: { id: input.addressId, userId } });
  if (!address) throw badRequest('Please select a valid delivery address');
  if (input.paymentMethod === 'ONLINE' && !settings.payment.onlineEnabled) throw badRequest('Online payment is currently unavailable');

  let order: Order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId }, include: { items: { where: { savedForLater: false } } } });
      if (!cart || cart.items.length === 0) throw badRequest('Your cart is empty');

      const priced = await priceCart(
        cart.items.map((i) => ({ id: i.id, productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        { couponCode: cart.couponCode, userId, pincode: address.pincode, db: tx },
      );
      if (priced.hasIssues) {
        throw conflict('Some items in your cart are no longer available in the quantity you selected. Please review your cart.', 'CART_INVALID');
      }
      if (cart.couponCode && priced.couponError) {
        throw conflict(`Coupon ${cart.couponCode} can no longer be applied: ${priced.couponError}`, 'COUPON_INVALID');
      }
      if (!priced.shipping.deliverable) throw badRequest('Sorry, we do not deliver to this PIN code yet');

      const { summary } = priced;
      const free = summary.total === 0;
      if (input.paymentMethod === 'COD') {
        if (!priced.shipping.codAvailable) throw badRequest('Cash on Delivery is not available for this address');
        if (settings.payment.codMaxAmount > 0 && summary.total > settings.payment.codMaxAmount) {
          throw badRequest(`Cash on Delivery is available only for orders up to ₹${settings.payment.codMaxAmount / 100}`);
        }
      }

      const created = await tx.order.create({
        data: {
          userId,
          paymentMethod: input.paymentMethod,
          paymentStatus: free ? 'PAID' : 'PENDING',
          mrpTotal: summary.mrpTotal,
          discount: summary.discount,
          subtotal: summary.subtotal,
          couponCode: summary.couponCode,
          couponDiscount: summary.couponDiscount,
          shippingFee: summary.shippingFee,
          tax: summary.tax,
          taxInclusive: summary.taxInclusive,
          total: summary.total,
          notes: input.notes || null,
          idempotencyKey: input.idempotencyKey ?? null,
          expectedDelivery: addDays(new Date(), priced.shipping.maxDays),
          shippingAddress: {
            fullName: address.fullName,
            phone: address.phone,
            address: address.address,
            apartment: address.apartment,
            street: address.street,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            landmark: address.landmark,
          },
          items: {
            create: priced.items.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              name: l.name,
              sku: l.sku,
              image: l.image,
              variantLabel: l.variantLabel,
              mrp: l.mrp,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              taxRate: l.taxRate,
              taxAmount: l.taxAmount,
              lineTotal: l.lineTotal,
              netAmount: l.netAmount,
            })),
          },
        },
      });
      const orderNumber = `SH${100000 + created.seq}`;
      await tx.order.update({ where: { id: created.id }, data: { orderNumber } });

      for (const line of priced.items) {
        if (!line.inventoryId) throw conflict('Some items in your cart just went out of stock. Please review your cart.', 'OUT_OF_STOCK');
        await reserveStock(tx, { inventoryId: line.inventoryId, quantity: line.quantity, orderId: created.id, note: `Order ${orderNumber}` });
      }

      if (summary.couponCode) {
        const coupon = await tx.coupon.findUniqueOrThrow({ where: { code: summary.couponCode } });
        const claimed = await tx.$executeRaw`
          UPDATE coupons SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
          WHERE id = ${coupon.id} AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
        if (claimed === 0) throw conflict('This coupon has just reached its usage limit', 'COUPON_INVALID');
        await tx.couponUsage.create({ data: { couponId: coupon.id, userId, orderId: created.id, discount: summary.couponDiscount } });
      }

      if (input.paymentMethod === 'COD' || free) {
        await tx.payment.create({
          data: {
            orderId: created.id,
            gateway: 'COD',
            method: free ? 'none' : 'cod',
            amount: summary.total,
            status: free ? 'PAID' : 'PENDING',
            paidAt: free ? new Date() : null,
          },
        });
      }

      await addHistory(tx, created.id, 'PENDING', input.paymentMethod === 'ONLINE' && !free ? 'Order placed — awaiting payment' : 'Order placed', 'customer');
      await tx.cartItem.deleteMany({ where: { cartId: cart.id, savedForLater: false } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
      return { ...created, orderNumber };
    }, TX_OPTIONS);
  } catch (err) {
    // A concurrent request with the same idempotency key won the race — return its order.
    if (input.idempotencyKey && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const existing = await prisma.order.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
      });
      if (existing) return existing;
    }
    throw err;
  }

  // Online orders are announced once the payment is verified.
  if (order.paymentMethod === 'COD' || order.total === 0) void notifyOrderEvent(order.id, 'ORDER_CREATED');
  return order;
}

// ───────────────────────── Cancel ─────────────────────────
export const customerCanCancel = (status: OrderStatus) => CANCELLABLE_BY.customer.includes(status);

async function cancelOrderInTx(tx: Tx, orderId: string, actor: Actor, reason: string) {
  await lockOrder(tx, orderId);
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, payments: true, couponUsage: true } });
  if (!CANCELLABLE_BY[actor].includes(order.status)) {
    throw conflict(
      order.status === 'CANCELLED' ? 'This order is already cancelled' : 'This order can no longer be cancelled',
      'NOT_CANCELLABLE',
    );
  }

  for (const item of order.items) {
    const inventoryId = await findInventoryId(tx, item.productId, item.variantId);
    if (!inventoryId) continue;
    const m = { inventoryId, quantity: item.quantity, orderId, note: `Order ${order.orderNumber} cancelled` };
    if (order.stockCommitted) {
      await restoreStock(tx, m, 'CANCEL');
      await tx.product.update({ where: { id: item.productId }, data: { salesCount: { decrement: item.quantity } } });
    } else {
      await releaseStock(tx, m);
    }
  }

  if (order.couponUsage) {
    await tx.couponUsage.delete({ where: { id: order.couponUsage.id } });
    await tx.$executeRaw`UPDATE coupons SET "usedCount" = GREATEST("usedCount" - 1, 0), "updatedAt" = now() WHERE id = ${order.couponUsage.couponId}`;
  }

  await addHistory(tx, orderId, 'CANCELLED', reason, actor);
  const paid = order.payments.find((p) => p.status === 'PAID' && p.amount > 0);
  if (paid) {
    await tx.payment.update({ where: { id: paid.id }, data: { status: 'REFUND_PENDING' } });
    await tx.refund.create({
      data: { orderId, paymentId: paid.id, userId: order.userId, type: 'CANCELLATION', status: 'APPROVED', amount: paid.amount, reason },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'REFUND_PENDING', paymentStatus: 'REFUND_PENDING', cancelReason: reason, cancelledAt: new Date(), stockCommitted: false },
    });
    await addHistory(tx, orderId, 'REFUND_PENDING', 'Refund will be processed to the original payment method', 'system');
  } else {
    if (order.paymentMethod === 'ONLINE') {
      await tx.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'FAILED', failureReason: 'Order cancelled before payment' } });
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        paymentStatus: order.paymentMethod === 'ONLINE' && order.paymentStatus === 'PENDING' ? 'FAILED' : order.paymentStatus,
        cancelReason: reason,
        cancelledAt: new Date(),
        stockCommitted: false,
      },
    });
  }
}

export async function cancelOrder(orderId: string, actor: Actor, reason: string) {
  await prisma.$transaction((tx) => cancelOrderInTx(tx, orderId, actor, reason), TX_OPTIONS);
  void notifyOrderEvent(orderId, 'ORDER_CANCELLED', { reason });
}

// Cancels online orders whose payment was never completed, releasing their reserved stock.
export async function expireStalePendingOrders(): Promise<number> {
  const settings = await getSettings();
  const cutoff = new Date(Date.now() - settings.payment.pendingPaymentExpiryMinutes * 60_000);
  const stale = await prisma.order.findMany({
    where: { status: 'PENDING', paymentMethod: 'ONLINE', paymentStatus: { in: ['PENDING', 'FAILED'] }, total: { gt: 0 }, createdAt: { lt: cutoff } },
    select: { id: true },
    take: 50,
  });
  let cancelled = 0;
  for (const { id } of stale) {
    try {
      await cancelOrder(id, 'system', 'Payment was not completed in time');
      cancelled++;
    } catch (err) {
      if (!(err instanceof ApiError)) logger.error('Failed to expire an unpaid order', err);
    }
  }
  return cancelled;
}

// ───────────────────────── Admin status transitions ─────────────────────────
export interface StatusUpdate {
  status: OrderStatus;
  note?: string;
  courier?: string;
  trackingNumber?: string;
}

export async function adminUpdateStatus(orderId: string, update: StatusUpdate) {
  if (update.status === 'CANCELLED') {
    await cancelOrder(orderId, 'admin', update.note?.trim() || 'Cancelled by the store');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await lockOrder(tx, orderId);
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, payments: true, refunds: true } });
    if (!ADMIN_TRANSITIONS[order.status].includes(update.status)) {
      throw conflict(`An order that is ${order.status.replaceAll('_', ' ').toLowerCase()} cannot be moved to ${update.status.replaceAll('_', ' ').toLowerCase()}`);
    }
    const note = update.note?.trim() || null;

    switch (update.status) {
      case 'CONFIRMED': {
        if (order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'PAID') {
          throw conflict('This order is still awaiting online payment and cannot be confirmed yet');
        }
        await confirmOrderInTx(tx, orderId, note ?? 'Order confirmed', 'admin');
        break;
      }
      case 'SHIPPED': {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'SHIPPED', courier: update.courier?.trim() || order.courier, trackingNumber: update.trackingNumber?.trim() || order.trackingNumber },
        });
        await addHistory(tx, orderId, 'SHIPPED', note, 'admin');
        break;
      }
      case 'DELIVERED': {
        const now = new Date();
        const cod = order.paymentMethod === 'COD' && order.paymentStatus === 'PENDING';
        if (cod) {
          await tx.payment.updateMany({ where: { orderId, gateway: 'COD', status: 'PENDING' }, data: { status: 'PAID', paidAt: now } });
        }
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'DELIVERED', deliveredAt: now, ...(cod ? { paymentStatus: 'PAID' as const } : {}) },
        });
        await addHistory(tx, orderId, 'DELIVERED', note ?? (cod ? 'Delivered — cash collected' : null), 'admin');
        break;
      }
      case 'RETURNED': {
        // Returned items are back in the warehouse: restock them and queue the refund.
        const refund = order.refunds.find((r) => r.type === 'RETURN' && r.status === 'APPROVED');
        if (!refund) throw conflict('No approved return found for this order');
        const lines = refund.items as { orderItemId: string; quantity: number }[];
        for (const line of lines) {
          const item = order.items.find((i) => i.id === line.orderItemId);
          if (!item) continue;
          const inventoryId = await findInventoryId(tx, item.productId, item.variantId);
          if (inventoryId) {
            await restoreStock(tx, { inventoryId, quantity: line.quantity, orderId, note: `Return for order ${order.orderNumber}` }, 'RETURN');
          }
          await tx.orderItem.update({ where: { id: item.id }, data: { returnedQty: { increment: line.quantity } } });
        }
        await addHistory(tx, orderId, 'RETURNED', note ?? 'Returned items received', 'admin');
        await tx.payment.updateMany({ where: { orderId, status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } }, data: { status: 'REFUND_PENDING' } });
        await tx.order.update({ where: { id: orderId }, data: { status: 'REFUND_PENDING', paymentStatus: 'REFUND_PENDING' } });
        await addHistory(tx, orderId, 'REFUND_PENDING', 'Refund is being processed', 'system');
        break;
      }
      default: {
        await tx.order.update({ where: { id: orderId }, data: { status: update.status } });
        await addHistory(tx, orderId, update.status, note, 'admin');
      }
    }
  }, TX_OPTIONS);

  const events = {
    CONFIRMED: 'ORDER_CONFIRMED',
    PACKED: 'ORDER_PACKED',
    SHIPPED: 'ORDER_SHIPPED',
    OUT_FOR_DELIVERY: 'ORDER_OUT_FOR_DELIVERY',
    DELIVERED: 'ORDER_DELIVERED',
  } as const;
  const event = events[update.status as keyof typeof events];
  if (event) void notifyOrderEvent(orderId, event);
}

// ───────────────────────── Customer queries ─────────────────────────

export function canPay(order: Pick<Order, 'status' | 'paymentMethod' | 'paymentStatus' | 'total'>): boolean {
  return order.status === 'PENDING' && order.paymentMethod === 'ONLINE' && order.total > 0 && ['PENDING', 'FAILED'].includes(order.paymentStatus);
}

export async function listCustomerOrders(userId: string, q: { page: number; limit: number; statuses?: OrderStatus[] }) {
  const where = { userId, ...(q.statuses ? { status: { in: q.statuses } } : {}) };
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { items: { select: { id: true, name: true, image: true, quantity: true, variantLabel: true } } },
    }),
    prisma.order.count({ where }),
  ]);
  const items = rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    total: o.total,
    expectedDelivery: o.expectedDelivery,
    deliveredAt: o.deliveredAt,
    items: o.items,
    canPay: canPay(o),
  }));
  return { items, total };
}

// Full order view for its owner, including what they may do next.
export async function getCustomerOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: { include: { product: { select: { slug: true } } } },
      history: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { createdAt: 'desc' } },
      refunds: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!order) throw notFound('Order');
  const reviewed = await prisma.review.findMany({
    where: { userId, productId: { in: order.items.map((i) => i.productId) } },
    select: { productId: true },
  });
  const { idempotencyKey: _key, seq: _seq, items, payments, refunds, ...rest } = order;
  return {
    ...rest,
    items: items.map(({ product, ...i }) => ({ ...i, slug: product.slug })),
    payments: payments.map((p) => ({
      id: p.id,
      gateway: p.gateway,
      method: p.method,
      amount: p.amount,
      status: p.status,
      transactionId: p.gatewayPaymentId,
      reference: p.reference,
      refundedAmount: p.refundedAmount,
      failureReason: p.failureReason,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
    refunds: refunds.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      amount: r.amount,
      reason: r.reason,
      adminNote: r.adminNote,
      items: r.items,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    })),
    reviewedProductIds: reviewed.map((r) => r.productId),
    canCancel: customerCanCancel(order.status),
    canReturn: await isReturnable(order),
    canPay: canPay(order),
    invoiceAvailable: !!order.invoiceNumber,
  };
}

export async function cancelCustomerOrder(userId: string, orderId: string, reason: string): Promise<void> {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, select: { id: true } });
  if (!order) throw notFound('Order');
  await cancelOrder(order.id, 'customer', reason);
}

// Loads an order for its invoice. Pass a userId to restrict it to the owner; admins pass none.
export async function getOrderForInvoice(orderId: string, userId?: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, ...(userId ? { userId } : {}) },
    include: { items: true, user: { select: { name: true, email: true, phone: true } } },
  });
  if (!order) throw notFound('Order');
  if (!order.invoiceNumber) throw conflict('The invoice will be available once the order is confirmed');
  return order;
}
