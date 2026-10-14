import type { Prisma } from '@prisma/client';
import { ADMIN_TRANSITIONS } from '../../constants/index.js';
import { prisma } from '../../database/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import type { AdminOrdersQuery, CustomersQuery, PaymentsQuery, RefundsQuery } from '../../validators/adminSales.validators.js';
import { adminUpdateStatus } from '../order.service.js';

// Read models for the admin's sales screens: orders, customers, payments and refunds.

const contains = (q: string) => ({ contains: q, mode: 'insensitive' as const });

// ───────────────────────── Orders ─────────────────────────

export async function listOrders(q: AdminOrdersQuery) {
  const and: Prisma.OrderWhereInput[] = [];
  if (q.q) {
    and.push({ OR: [{ orderNumber: contains(q.q) }, { user: { name: contains(q.q) } }, { user: { email: contains(q.q) } }, { user: { phone: { contains: q.q } } }] });
  }
  if (q.status) and.push({ status: q.status });
  if (q.paymentStatus) and.push({ paymentStatus: q.paymentStatus });
  if (q.method) and.push({ paymentMethod: q.method });
  if (q.customerId) and.push({ userId: q.customerId });
  if (q.from) and.push({ createdAt: { gte: q.from } });
  if (q.to) and.push({ createdAt: { lte: q.to } });
  const where = { AND: and };

  const [rows, total, statusCounts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { user: { select: { id: true, name: true, email: true } }, _count: { select: { items: true } } },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const items = rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    customer: o.user,
    itemCount: o._count.items,
    total: o.total,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
  }));
  return { items, total, statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all])) };
}

export async function getOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      items: { include: { product: { select: { slug: true } } } },
      history: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { createdAt: 'desc' } },
      refunds: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!order) throw notFound('Order');
  const awaitingPayment = order.status === 'PENDING' && order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'PAID';
  const { idempotencyKey: _key, items, ...rest } = order;
  return {
    ...rest,
    items: items.map(({ product, ...i }) => ({ ...i, slug: product.slug })),
    awaitingPayment,
    // What the admin may do next. An unpaid online order can only be cancelled.
    nextStatuses: ADMIN_TRANSITIONS[order.status].filter((s) => !(awaitingPayment && s === 'CONFIRMED')),
  };
}

export async function getOrderSummary(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, status: true, orderNumber: true } });
  if (!order) throw notFound('Order');
  return order;
}

// ───────────────────────── Customers ─────────────────────────

// Orders that count towards a customer's spend (not cancelled / refunded / awaiting online payment).
const COUNTS_AS_SPEND: Prisma.OrderWhereInput = {
  status: { notIn: ['CANCELLED', 'REFUND_PENDING', 'REFUNDED', 'RETURNED'] },
  NOT: { status: 'PENDING', paymentMethod: 'ONLINE', paymentStatus: { not: 'PAID' } },
};

export async function listCustomers(q: CustomersQuery) {
  const where: Prisma.UserWhereInput = {
    role: 'CUSTOMER',
    ...(q.status ? { isActive: q.status === 'active' } : {}),
    ...(q.q ? { OR: [{ name: contains(q.q) }, { email: contains(q.q) }, { phone: { contains: q.q } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true, lastLoginAt: true, _count: { select: { orders: true } } },
    }),
    prisma.user.count({ where }),
  ]);
  const spend = await prisma.order.groupBy({ by: ['userId'], where: { AND: [COUNTS_AS_SPEND, { userId: { in: rows.map((r) => r.id) } }] }, _sum: { total: true } });
  const spendBy = new Map(spend.map((s) => [s.userId, s._sum.total ?? 0]));
  return { items: rows.map(({ _count, ...u }) => ({ ...u, orderCount: _count.orders, totalSpent: spendBy.get(u.id) ?? 0 })), total };
}

export async function getCustomer(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, role: 'CUSTOMER' },
    select: { id: true, name: true, email: true, phone: true, avatarUrl: true, isActive: true, createdAt: true, lastLoginAt: true, addresses: true },
  });
  if (!user) throw notFound('Customer');
  const [recentOrders, orderCount, spend, reviews, tickets, wishlistCount] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, orderNumber: true, createdAt: true, total: true, status: true, paymentStatus: true, paymentMethod: true },
    }),
    prisma.order.count({ where: { userId: user.id } }),
    prisma.order.aggregate({ where: { AND: [COUNTS_AS_SPEND, { userId: user.id }] }, _sum: { total: true } }),
    prisma.review.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, rating: true, comment: true, createdAt: true, product: { select: { name: true } } } }),
    prisma.supportTicket.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, subject: true, status: true, createdAt: true } }),
    prisma.wishlistItem.count({ where: { wishlist: { userId: user.id } } }),
  ]);
  return { ...user, orderCount, totalSpent: spend._sum.total ?? 0, wishlistCount, recentOrders, reviews, tickets };
}

export async function setCustomerActive(id: string, isActive: boolean) {
  const user = await prisma.user.findFirst({ where: { id, role: 'CUSTOMER' } });
  if (!user) throw notFound('Customer');
  await prisma.user.update({ where: { id: user.id }, data: { isActive } });
  // Disabling signs the customer out everywhere.
  if (!isActive) await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  return { id: user.id, email: user.email, isActive };
}

// ───────────────────────── Payments ─────────────────────────

export async function listPayments(q: PaymentsQuery) {
  const and: Prisma.PaymentWhereInput[] = [];
  if (q.status) and.push({ status: q.status });
  if (q.method) and.push(q.method === 'cod' ? { gateway: 'COD' } : { method: q.method });
  if (q.from) and.push({ createdAt: { gte: q.from } });
  if (q.to) and.push({ createdAt: { lte: q.to } });
  if (q.q) {
    and.push({
      OR: [
        { gatewayPaymentId: contains(q.q) },
        { gatewayOrderId: contains(q.q) },
        { order: { orderNumber: contains(q.q) } },
        { order: { user: { name: contains(q.q) } } },
        { order: { user: { email: contains(q.q) } } },
      ],
    });
  }
  const where = { AND: and };
  const [rows, total, sums] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { order: { select: { id: true, orderNumber: true, user: { select: { id: true, name: true, email: true } } } } },
    }),
    prisma.payment.count({ where }),
    prisma.payment.groupBy({ by: ['status'], _sum: { amount: true, refundedAmount: true }, _count: { _all: true } }),
  ]);
  const items = rows.map((p) => ({
    id: p.id,
    transactionId: p.gatewayPaymentId ?? p.gatewayOrderId ?? p.id,
    orderId: p.order.id,
    orderNumber: p.order.orderNumber,
    customer: p.order.user,
    amount: p.amount,
    refundedAmount: p.refundedAmount,
    method: p.method ?? (p.gateway === 'COD' ? 'cod' : null),
    gateway: p.gateway,
    status: p.status,
    reference: p.reference,
    failureReason: p.failureReason,
    createdAt: p.createdAt,
    paidAt: p.paidAt,
  }));
  const summary = Object.fromEntries(sums.map((s) => [s.status, { count: s._count._all, amount: s._sum.amount ?? 0, refunded: s._sum.refundedAmount ?? 0 }]));
  return { items, total, summary };
}

// ───────────────────────── Refunds ─────────────────────────

export async function listRefunds(q: RefundsQuery) {
  const where = { ...(q.status ? { status: q.status } : {}), ...(q.type ? { type: q.type } : {}) };
  const [rows, total, counts] = await Promise.all([
    prisma.refund.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        payment: { select: { gateway: true, method: true, gatewayPaymentId: true } },
        order: { select: { id: true, orderNumber: true, status: true, total: true, paymentMethod: true, items: { select: { id: true, name: true, variantLabel: true, quantity: true, image: true } } } },
      },
    }),
    prisma.refund.count({ where }),
    prisma.refund.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true } }),
  ]);
  const items = rows.map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    amount: r.amount,
    reason: r.reason,
    adminNote: r.adminNote,
    items: r.items,
    gatewayRefundId: r.gatewayRefundId,
    reference: r.reference,
    createdAt: r.createdAt,
    processedAt: r.processedAt,
    completedAt: r.completedAt,
    customer: r.user,
    order: r.order,
    // Refunds for payments taken through the gateway go back through it; COD refunds are manual.
    viaGateway: !!r.payment && r.payment.gateway !== 'COD' && !!r.payment.gatewayPaymentId,
  }));
  const summary = Object.fromEntries(counts.map((c) => [c.status, { count: c._count._all, amount: c._sum.amount ?? 0 }]));
  return { items, total, summary };
}

// Marks the returned goods as received (order RETURN_APPROVED → RETURNED → REFUND_PENDING).
export async function markReturnReceived(refundId: string) {
  const refund = await prisma.refund.findUnique({ where: { id: refundId } });
  if (!refund) throw notFound('Refund');
  if (refund.type !== 'RETURN' || refund.status !== 'APPROVED') throw badRequest('This return is not awaiting items');
  await adminUpdateStatus(refund.orderId, { status: 'RETURNED' });
  return refund;
}
