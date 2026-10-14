import { Card } from '@/components/admin/Card';
import { FilterSelect, Tabs } from '@/components/admin/Filters';
import { PageHeader } from '@/components/admin/PageHeader';
import { clsx } from '@/components/ui';
import { Badge, ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { REFUND_STATUS } from '@/constants';
import { useListParams } from '@/hooks/useListParams';
import { useSeo } from '@/hooks/useSeo';
import { RefundActions } from '@/sections/admin/orders/RefundActions';
import { adminRefundService } from '@/services/adminService';
import type { RefundStatus } from '@/types';
import { formatDateTime, money } from '@/utils/format';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export function RefundsPage() {
  useSeo({ title: 'Refunds — Admin', noindex: true });
  const { get, set, page } = useListParams();
  const query = { status: get('status'), type: get('type'), page, limit: 10 };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin', 'refunds', query],
    queryFn: () => adminRefundService.list(query),
    placeholderData: keepPreviousData,
    // Processing refunds complete when the gateway's webhook arrives — keep the list fresh.
    refetchInterval: (q) => (q.state.data?.data.some((r) => r.status === 'PROCESSING') ? 4000 : 30_000),
  });
  const summary = data?.meta.summary ?? {};
  const statuses: RefundStatus[] = ['REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED'];

  return (
    <div>
      <PageHeader title="Refunds" subtitle="Review return requests and process refunds. A refund is marked completed only when the payment gateway confirms it." />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
          <Tabs value={query.status as RefundStatus | ''} onChange={(status) => set({ status })} tabs={[{ value: '' as const, label: 'All' }, ...statuses.map((s) => ({ value: s, label: REFUND_STATUS[s].label, count: summary[s]?.count ?? 0 }))]} />
          <FilterSelect label="Type" value={query.type} onChange={(type) => set({ type })} options={[{ value: '', label: 'All types' }, { value: 'RETURN', label: 'Returns' }, { value: 'CANCELLATION', label: 'Cancellations' }]} />
        </div>
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} compact />
        ) : isLoading ? (
          <PageSpinner />
        ) : data?.data.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-slate-500">No refund requests here</p>
        ) : (
          <ul className={clsx('divide-y divide-slate-100 transition-opacity', isFetching && 'opacity-70')}>
            {data?.data.map((r) => (
              <li key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      <Link to={`/admin/orders/${r.order.id}`} className="text-indigo-600 hover:underline">{r.order.orderNumber}</Link>
                      <Badge>{r.type === 'RETURN' ? 'Return' : 'Cancellation'}</Badge>
                      <Badge tone={REFUND_STATUS[r.status].tone}>{REFUND_STATUS[r.status].label}</Badge>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{r.customer.name} · {r.customer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tabular-nums text-slate-900">{money(r.amount)}</p>
                    <p className="text-xs text-slate-500">{r.viaGateway ? 'Refund via payment gateway' : 'Manual refund (COD / bank transfer)'}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-700"><span className="font-medium">Reason:</span> {r.reason}</p>
                {r.items.length > 0 && <p className="mt-1 text-xs text-slate-500">Items: {r.items.map((it) => `${r.order.items.find((i) => i.id === it.orderItemId)?.name ?? 'Item'} × ${it.quantity}`).join(', ')}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  Requested {formatDateTime(r.createdAt)}{r.processedAt && ` · Processing since ${formatDateTime(r.processedAt)}`}{r.completedAt && ` · Completed ${formatDateTime(r.completedAt)}`}{r.reference && ` · Ref ${r.reference}`}{r.gatewayRefundId && ` · Gateway ID ${r.gatewayRefundId}`}
                </p>
                {r.adminNote && <p className="mt-1 text-xs text-slate-600">Note: {r.adminNote}</p>}
                <div className="mt-3"><RefundActions refund={r} orderStatus={r.order.status} viaGateway={r.viaGateway} /></div>
              </li>
            ))}
          </ul>
        )}
        {data && data.meta.pages > 1 && <div className="border-t border-slate-100 p-3"><Pagination page={page} pages={data.meta.pages} onChange={(p) => set({ page: String(p) })} /></div>}
      </Card>
    </div>
  );
}
