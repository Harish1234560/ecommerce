import { clsx } from '@/components/ui';
import { ORDER_STATUS } from '@/constants';
import type { OrderDetail, OrderStatus } from '@/types';
import { formatDate, formatDateTime } from '@/utils/format';
import { Check, CircleDot, MapPin, Package, PackageCheck, RotateCcw, Truck, XCircle } from 'lucide-react';

const TRACKING_STEPS: { status: OrderStatus; label: string; icon: typeof Package }[] = [
  { status: 'PENDING', label: 'Order Placed', icon: Package },
  { status: 'CONFIRMED', label: 'Confirmed', icon: Check },
  { status: 'PACKED', label: 'Packed', icon: PackageCheck },
  { status: 'SHIPPED', label: 'Shipped', icon: Truck },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: MapPin },
  { status: 'DELIVERED', label: 'Delivered', icon: Check },
];

// Delivery progress built from the order's status history.
export function TrackingTimeline({ order }: { order: OrderDetail }) {
  const at = (s: OrderStatus) => order.history.find((h) => h.status === s)?.createdAt;
  const reachedIndex = TRACKING_STEPS.reduce((max, step, i) => (at(step.status) ? i : max), 0);
  const afterDelivery = order.history.filter((h) => !TRACKING_STEPS.some((f) => f.status === h.status) && h.status !== 'PROCESSING');
  const stopped = order.status === 'CANCELLED' || (order.cancelledAt !== null && !order.deliveredAt);

  return (
    <ol className="relative">
      {TRACKING_STEPS.map((step, i) => {
        const done = i <= reachedIndex;
        const current = i === reachedIndex && !stopped && order.status !== 'DELIVERED' && !order.deliveredAt;
        const skipped = stopped && i > reachedIndex;
        if (skipped) return null;
        const time = at(step.status);
        const last = i === TRACKING_STEPS.length - 1 || (stopped && i === reachedIndex);
        return (
          <li key={step.status} className="relative flex gap-4 pb-8 last:pb-0">
            {!last && <span className={clsx('absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5', i < reachedIndex ? 'bg-brand-600' : 'bg-stone-200')} aria-hidden />}
            <span className={clsx('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white', done ? 'bg-brand-600 text-white' : 'bg-stone-200 text-stone-400', current && 'animate-pulse')}>
              {done ? <step.icon className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
            </span>
            <div className="pt-1">
              <p className={clsx('text-sm font-semibold', done ? 'text-stone-900' : 'text-stone-400')}>{step.label}</p>
              {done && time && <p className="text-xs text-stone-500">{formatDateTime(time)}</p>}
              {step.status === 'SHIPPED' && done && order.trackingNumber && <p className="mt-0.5 text-xs text-stone-600">{order.courier ?? 'Courier'} · Tracking no. <span className="font-semibold">{order.trackingNumber}</span></p>}
              {!done && step.status === 'DELIVERED' && order.expectedDelivery && <p className="text-xs text-stone-500">Expected by {formatDate(order.expectedDelivery)}</p>}
            </div>
          </li>
        );
      })}
      {afterDelivery.map((h) => (
        <li key={h.id} className="relative flex gap-4 pt-8">
          <span className="absolute -top-0 left-[15px] h-8 w-0.5 bg-stone-200" aria-hidden />
          <span className={clsx('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ring-4 ring-white', h.status === 'CANCELLED' ? 'bg-rose-500' : h.status === 'REFUNDED' ? 'bg-brand-600' : 'bg-amber-500')}>
            {h.status === 'CANCELLED' ? <XCircle className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          </span>
          <div className="pt-1">
            <p className="text-sm font-semibold text-stone-900">{ORDER_STATUS[h.status].label}</p>
            <p className="text-xs text-stone-500">{formatDateTime(h.createdAt)}</p>
            {h.note && <p className="mt-0.5 text-xs text-stone-600">{h.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
