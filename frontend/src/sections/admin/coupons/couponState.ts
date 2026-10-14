import { type AdminCoupon } from '@/types/admin';

export function couponState(c: AdminCoupon): { label: string; tone: 'success' | 'neutral' | 'warning' | 'danger' } {
  const now = Date.now();
  if (!c.isActive) return { label: 'Inactive', tone: 'neutral' };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return { label: 'Expired', tone: 'danger' };
  if (new Date(c.startsAt).getTime() > now) return { label: 'Scheduled', tone: 'warning' };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { label: 'Limit reached', tone: 'danger' };
  return { label: 'Active', tone: 'success' };
}
