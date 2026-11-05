import { OrderStatusBadge } from '@/components/order/StatusBadges';
import { TrackingTimeline } from '@/components/order/TrackingTimeline';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { useOrder } from '@/hooks/useOrder';
import { useSeo } from '@/hooks/useSeo';
import { formatAddress } from '@/utils/address';
import { formatDate } from '@/utils/format';
import { Link, useParams } from 'react-router-dom';

export function OrderTrackingPage() {
  const { orderId = '' } = useParams();
  const { data: order, isLoading, error, refetch } = useOrder(orderId);
  useSeo({ title: order ? `Track order ${order.orderNumber}` : 'Track order', noindex: true });

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (error || !order) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return (
    <div className="space-y-5">
      <div>
        <Link to={`/account/orders/${order.id}`} className="text-sm font-medium text-stone-500 hover:text-stone-900">← Order details</Link>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Track order {order.orderNumber}</h1>
      </div>
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Status</p>
          <p className="mt-1"><OrderStatusBadge status={order.status} /></p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{order.deliveredAt ? 'Delivered on' : 'Expected delivery'}</p>
          <p className="mt-1 font-semibold text-stone-900">{order.cancelledAt && !order.deliveredAt ? '—' : formatDate(order.deliveredAt ?? order.expectedDelivery, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Courier</p>
          <p className="mt-1 font-semibold text-stone-900">{order.trackingNumber ? `${order.courier ?? 'Courier'} · ${order.trackingNumber}` : 'Assigned when shipped'}</p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-[1fr_300px]">
        <section className="card p-5 sm:p-6"><TrackingTimeline order={order} /></section>
        <section className="card h-fit p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500">Delivering to</h2>
          <p className="font-semibold text-stone-900">{order.shippingAddress.fullName}</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">{formatAddress(order.shippingAddress)}</p>
          <ul className="mt-4 space-y-2 border-t border-stone-200 pt-4">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-2.5 text-sm"><Img src={i.image} alt="" className="h-10 w-10 rounded-lg object-cover" /><span className="line-clamp-1 flex-1 text-stone-700">{i.name}</span><span className="text-stone-500">×{i.quantity}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
