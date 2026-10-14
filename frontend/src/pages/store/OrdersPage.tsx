import { OrderStatusBadge, PaymentStatusBadge } from '@/components/order/StatusBadges';
import { clsx } from '@/components/ui';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { Pagination } from '@/components/ui/Pagination';
import { ORDER_STATUS } from '@/constants';
import { useSeo } from '@/hooks/useSeo';
import { orderService } from '@/services/orderService';
import { formatDate, money } from '@/utils/format';
import { cancelledUnpaidCod } from '@/utils/order';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, Package } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export const ORDER_TABS = [
  { key: '', label: 'All' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returned', label: 'Returned' },
  { key: 'refunded', label: 'Refunded' },
];

export function OrdersPage() {
  useSeo({ title: 'My Orders', noindex: true });
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['orders', 'list', status, page],
    queryFn: () => orderService.list({ status, page, limit: 8 }),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-stone-900">My orders</h1>
      <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Filter orders">
        {ORDER_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={status === t.key}
            onClick={() => setParams(t.key ? { status: t.key } : {})}
            className={clsx('shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors', status === t.key ? 'border-ink bg-ink text-white' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data || data.data.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Package />} title={status ? 'No orders in this category' : 'No orders yet'} message={status ? 'Try a different filter.' : 'When you place an order it will show up here.'} action={<Link to="/products" className={buttonClass('primary')}>Start shopping</Link>} />
        </div>
      ) : (
        <>
          <ul className={clsx('space-y-4 transition-opacity', isFetching && 'opacity-60')}>
            {data.data.map((o) => (
              <li key={o.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-stone-200 bg-stone-50/70 px-4 py-3 text-sm sm:px-5">
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span><span className="text-stone-500">Order </span><span className="font-semibold text-stone-900">{o.orderNumber}</span></span>
                    <span className="text-stone-500">Placed {formatDate(o.createdAt)}</span>
                    <span><span className="text-stone-500">Total </span><span className="font-semibold text-stone-900">{money(o.total)}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={o.status} />
                    <PaymentStatusBadge status={o.paymentStatus} cancelledCod={cancelledUnpaidCod(o)} />
                  </div>
                </div>
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex -space-x-3">
                      {o.items.slice(0, 3).map((i) => (
                        <Img key={i.id} src={i.image} alt="" className="h-14 w-14 rounded-xl border-2 border-white object-cover" />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-medium text-stone-900">{o.items[0]?.name}{o.items.length > 1 && ` + ${o.items.length - 1} more`}</p>
                      <p className="text-xs text-stone-500">
                        {o.status === 'DELIVERED' && o.deliveredAt
                          ? `Delivered on ${formatDate(o.deliveredAt)}`
                          : ['CANCELLED', 'REFUNDED', 'REFUND_PENDING', 'RETURNED', 'RETURN_REQUESTED', 'RETURN_APPROVED'].includes(o.status)
                            ? ORDER_STATUS[o.status].label
                            : `Expected by ${formatDate(o.expectedDelivery)}`}
                        {' · '}{o.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid online'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {o.canPay && <Link to={`/account/orders/${o.id}`} className={buttonClass('brand', 'sm')}>Complete payment</Link>}
                    {['SHIPPED', 'OUT_FOR_DELIVERY', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.status) && <Link to={`/account/orders/${o.id}/tracking`} className={buttonClass('outline', 'sm')}>Track</Link>}
                    <Link to={`/account/orders/${o.id}`} className={buttonClass('primary', 'sm')}>View details <ChevronRight className="h-4 w-4" /></Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Pagination page={page} pages={data.meta.pages} onChange={(p) => setParams({ ...(status ? { status } : {}), ...(p > 1 ? { page: String(p) } : {}) })} />
          </div>
        </>
      )}
    </div>
  );
}
