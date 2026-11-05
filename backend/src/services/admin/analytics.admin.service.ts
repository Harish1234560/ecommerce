import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { AnalyticsRange } from '../../validators/adminSales.validators.js';
import { countLowStock, listLowStock } from './inventory.admin.service.js';

// Sales analytics for a date range, bucketed by day (or by month for long ranges) in the store's time zone.

const DASHBOARD_LOW_STOCK_ITEMS = 6;
const DASHBOARD_RECENT_ORDERS = 8;

const TZ = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 3600_000;

// An order counts as a sale unless it was cancelled/returned/refunded or is an unpaid online order.
const SALE = Prisma.sql`o.status NOT IN ('CANCELLED','REFUND_PENDING','REFUNDED','RETURNED')
  AND NOT (o.status = 'PENDING' AND o."paymentMethod" = 'ONLINE' AND o."paymentStatus" <> 'PAID')`;

// Start of the given instant's calendar day in India, as a UTC Date.
function startOfDayIST(d: Date): Date {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

function resolveRange(q: AnalyticsRange) {
  const now = new Date();
  const today = startOfDayIST(now);
  const day = 86_400_000;
  let from: Date;
  let to = new Date(today.getTime() + day);
  switch (q.range) {
    case 'today':
      from = today;
      break;
    case '7d':
      from = new Date(today.getTime() - 6 * day);
      break;
    case 'year': {
      const ist = new Date(now.getTime() + IST_OFFSET_MS);
      from = new Date(Date.UTC(ist.getUTCFullYear(), 0, 1) - IST_OFFSET_MS);
      break;
    }
    case 'custom':
      from = startOfDayIST(q.from ?? new Date(today.getTime() - 29 * day));
      to = new Date(startOfDayIST(q.to ?? now).getTime() + day);
      if (to <= from) to = new Date(from.getTime() + day);
      break;
    default:
      from = new Date(today.getTime() - 29 * day);
  }
  const days = Math.round((to.getTime() - from.getTime()) / day);
  return { from, to, days, unit: days > 92 ? ('month' as const) : ('day' as const) };
}

function bucketKeys(from: Date, to: Date, unit: 'day' | 'month'): string[] {
  const keys: string[] = [];
  const cursor = new Date(from.getTime() + IST_OFFSET_MS);
  const end = new Date(to.getTime() + IST_OFFSET_MS);
  if (unit === 'month') cursor.setUTCDate(1);
  while (cursor < end) {
    keys.push(unit === 'day' ? cursor.toISOString().slice(0, 10) : cursor.toISOString().slice(0, 7));
    if (unit === 'day') cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

export async function getAnalytics(q: AnalyticsRange) {
  const { from, to, unit } = resolveRange(q);
  const fmt = unit === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';
  const inRange = Prisma.sql`o."createdAt" >= ${from} AND o."createdAt" < ${to}`;

  const [totals, orderSeries, customerSeries, topProducts, categorySales, couponUsage, paymentMethods, refunds, statusBreakdown, newCustomers, buyers] =
    await Promise.all([
      prisma.$queryRaw<{ revenue: number; orders: number }[]>`
        SELECT COALESCE(SUM(o.total), 0)::float8 AS revenue, COUNT(*)::int AS orders FROM orders o WHERE ${inRange} AND ${SALE}`,
      prisma.$queryRaw<{ bucket: string; revenue: number; orders: number }[]>`
        SELECT to_char(o."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}, ${fmt}) AS bucket,
               COALESCE(SUM(o.total), 0)::float8 AS revenue, COUNT(*)::int AS orders
        FROM orders o WHERE ${inRange} AND ${SALE} GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<{ bucket: string; customers: number }[]>`
        SELECT to_char(u."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}, ${fmt}) AS bucket, COUNT(*)::int AS customers
        FROM users u WHERE u.role = 'CUSTOMER' AND u."createdAt" >= ${from} AND u."createdAt" < ${to} GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<{ productId: string; name: string; image: string | null; quantity: number; revenue: number }[]>`
        SELECT oi."productId", MAX(oi.name) AS name, MAX(oi.image) AS image, SUM(oi.quantity)::int AS quantity, SUM(oi."lineTotal")::float8 AS revenue
        FROM order_items oi JOIN orders o ON o.id = oi."orderId"
        WHERE ${inRange} AND ${SALE} GROUP BY oi."productId" ORDER BY quantity DESC, revenue DESC LIMIT 8`,
      prisma.$queryRaw<{ name: string; quantity: number; revenue: number }[]>`
        SELECT c.name, SUM(oi.quantity)::int AS quantity, SUM(oi."lineTotal")::float8 AS revenue
        FROM order_items oi JOIN orders o ON o.id = oi."orderId" JOIN products p ON p.id = oi."productId" JOIN categories c ON c.id = p."categoryId"
        WHERE ${inRange} AND ${SALE} GROUP BY c.name ORDER BY revenue DESC`,
      prisma.$queryRaw<{ code: string; uses: number; discount: number }[]>`
        SELECT c.code, COUNT(*)::int AS uses, COALESCE(SUM(cu.discount), 0)::float8 AS discount
        FROM coupon_usage cu JOIN coupons c ON c.id = cu."couponId"
        WHERE cu."createdAt" >= ${from} AND cu."createdAt" < ${to} GROUP BY c.code ORDER BY uses DESC LIMIT 10`,
      prisma.$queryRaw<{ method: string; count: number; amount: number }[]>`
        SELECT COALESCE(pm.method, lower(pm.gateway::text)) AS method, COUNT(*)::int AS count, COALESCE(SUM(pm.amount), 0)::float8 AS amount
        FROM payments pm JOIN orders o ON o.id = pm."orderId"
        WHERE ${inRange} AND ${SALE} AND pm.status <> 'FAILED' AND pm.amount > 0 GROUP BY 1 ORDER BY amount DESC`,
      prisma.$queryRaw<{ status: string; count: number; amount: number }[]>`
        SELECT r.status::text AS status, COUNT(*)::int AS count, COALESCE(SUM(r.amount), 0)::float8 AS amount
        FROM refunds r WHERE r."createdAt" >= ${from} AND r."createdAt" < ${to} GROUP BY 1`,
      prisma.$queryRaw<{ status: string; count: number }[]>`
        SELECT o.status::text AS status, COUNT(*)::int AS count FROM orders o WHERE ${inRange} GROUP BY 1`,
      prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: from, lt: to } } }),
      prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(DISTINCT o."userId")::int AS count FROM orders o WHERE ${inRange} AND ${SALE}`,
    ]);

  const ordersBy = new Map(orderSeries.map((r) => [r.bucket, r]));
  const customersBy = new Map(customerSeries.map((r) => [r.bucket, r.customers]));
  const series = bucketKeys(from, to, unit).map((key) => ({
    date: key,
    revenue: ordersBy.get(key)?.revenue ?? 0,
    orders: ordersBy.get(key)?.orders ?? 0,
    customers: customersBy.get(key) ?? 0,
  }));

  const revenue = totals[0]?.revenue ?? 0;
  const orders = totals[0]?.orders ?? 0;
  const completedRefunds = refunds.find((r) => r.status === 'COMPLETED');
  const totalCustomers = await prisma.user.count({ where: { role: 'CUSTOMER' } });
  const buyerCount = buyers[0]?.count ?? 0;

  return {
    range: { from, to: new Date(to.getTime() - 1), unit },
    stats: {
      revenue,
      orders,
      averageOrderValue: orders ? Math.round(revenue / orders) : 0,
      newCustomers,
      buyers: buyerCount,
      // Share of all registered customers who placed an order in this period.
      conversionRate: totalCustomers ? Math.round((buyerCount / totalCustomers) * 1000) / 10 : 0,
      refundAmount: completedRefunds?.amount ?? 0,
      refundCount: refunds.reduce((s, r) => s + r.count, 0),
    },
    series,
    topProducts,
    categorySales,
    couponUsage,
    paymentMethods,
    refunds,
    statusBreakdown,
  };
}

// The dashboard: analytics for the range plus current operational totals.
export async function getDashboard(range: AnalyticsRange) {
  const [analytics, totalCustomers, totalProducts, pendingOrders, lowStock, lowStockList, openRefunds, recentOrders, openTickets] = await Promise.all([
    getAnalytics(range),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.order.count({ where: { status: 'PENDING', NOT: { paymentMethod: 'ONLINE', paymentStatus: { not: 'PAID' } } } }),
    countLowStock(),
    listLowStock(DASHBOARD_LOW_STOCK_ITEMS),
    prisma.refund.count({ where: { status: { in: ['REQUESTED', 'APPROVED', 'PROCESSING', 'FAILED'] } } }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: DASHBOARD_RECENT_ORDERS,
      select: { id: true, orderNumber: true, createdAt: true, total: true, status: true, paymentStatus: true, paymentMethod: true, user: { select: { name: true } } },
    }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
  ]);
  return {
    ...analytics,
    totals: { customers: totalCustomers, products: totalProducts, pendingOrders, lowStock, openRefunds, openTickets },
    lowStockItems: lowStockList,
    recentOrders: recentOrders.map(({ user, ...o }) => ({ ...o, customer: user.name })),
  };
}
