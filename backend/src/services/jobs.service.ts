import { prisma } from '../database/prisma.js';
import { notifyAllCustomers } from './notification.service.js';
import { expireStalePendingOrders } from './order.service.js';
import { logger } from '../utils/logger.js';

// Background housekeeping. Runs in-process on a timer; each job is safe to run repeatedly.

const EXPIRY_NOTICE_HOURS = 48;

// "Coupon expiring" notification: once per coupon, when it is within 48 hours of expiry.
export async function notifyExpiringCoupons(): Promise<number> {
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRY_NOTICE_HOURS * 3600_000);
  const coupons = await prisma.coupon.findMany({ where: { isActive: true, showOnOffers: true, expiresAt: { gt: now, lte: soon } } });
  let sent = 0;
  for (const coupon of coupons) {
    // The link doubles as the "already announced" marker, so no extra bookkeeping is needed.
    const link = `/offers?expiring=${encodeURIComponent(coupon.code)}`;
    if (await prisma.notification.findFirst({ where: { link }, select: { id: true } })) continue;
    const off = coupon.discountType === 'PERCENTAGE' ? `${coupon.value}% off` : `₹${coupon.value / 100} off`;
    await notifyAllCustomers('OFFER', 'Coupon expiring soon', `${coupon.code} (${off}) expires soon — use it before it is gone.`, link);
    sent++;
  }
  return sent;
}

export function startJobs(): () => void {
  const run = (name: string, job: () => Promise<number>, describe: (n: number) => string) =>
    job()
      .then((n) => n > 0 && logger.info(describe(n)))
      .catch((err) => logger.error(`Background job "${name}" failed`, err));

  // Cancel online orders whose payment never completed, releasing their reserved stock.
  const everyMinute = setInterval(() => void run('expire-orders', expireStalePendingOrders, (n) => `Expired ${n} unpaid order(s)`), 60_000);
  const hourly = setInterval(() => void run('coupon-expiry', notifyExpiringCoupons, (n) => `Announced ${n} expiring coupon(s)`), 3600_000);
  void run('coupon-expiry', notifyExpiringCoupons, (n) => `Announced ${n} expiring coupon(s)`);

  return () => {
    clearInterval(everyMinute);
    clearInterval(hourly);
  };
}
