import { type DateRange } from '@/types/admin';

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export const defaultRange = (): DateRange => ({ range: '30d', from: isoDay(new Date(Date.now() - 29 * 86_400_000)), to: isoDay(new Date()) });

export const rangeParams = (r: DateRange) => (r.range === 'custom' ? { range: r.range, from: r.from, to: r.to } : { range: r.range });

export function bucketLabel(unit: 'day' | 'month') {
  return (key: string) => {
    if (!key) return '';
    if (unit === 'month') return new Date(`${key}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    return new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
}
