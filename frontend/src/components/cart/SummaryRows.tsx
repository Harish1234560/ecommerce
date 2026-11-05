import { clsx } from '@/components/ui';
import type { CartSummary } from '@/types';
import { money } from '@/utils/format';
import { type ReactNode } from 'react';

export function SummaryRows({ summary, showShipping = true }: { summary: Pick<CartSummary, 'mrpTotal' | 'discount' | 'couponCode' | 'couponDiscount' | 'shippingFee' | 'tax' | 'taxInclusive' | 'total'>; showShipping?: boolean }) {
  const Row = ({ label, value, accent }: { label: ReactNode; value: ReactNode; accent?: boolean }) => (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-stone-600">{label}</dt>
      <dd className={clsx('font-medium tabular-nums', accent ? 'text-emerald-700' : 'text-stone-900')}>{value}</dd>
    </div>
  );
  return (
    <dl className="space-y-2.5">
      <Row label="Subtotal" value={money(summary.mrpTotal)} />
      {summary.discount > 0 && <Row label="Discount" value={`− ${money(summary.discount)}`} accent />}
      {summary.couponDiscount > 0 && <Row label={<>Coupon{summary.couponCode ? <span className="ml-1 font-semibold text-stone-800">({summary.couponCode})</span> : null}</>} value={`− ${money(summary.couponDiscount)}`} accent />}
      {showShipping && <Row label="Delivery fee" value={summary.shippingFee > 0 ? money(summary.shippingFee) : 'Free'} accent={summary.shippingFee === 0} />}
      <Row label={summary.taxInclusive ? 'Tax (included)' : 'Tax'} value={money(summary.tax)} />
      <div className="flex items-center justify-between border-t border-dashed border-stone-300 pt-3">
        <dt className="text-base font-bold text-stone-900">Grand total</dt>
        <dd className="text-lg font-bold tabular-nums text-stone-900">{money(summary.total)}</dd>
      </div>
    </dl>
  );
}
