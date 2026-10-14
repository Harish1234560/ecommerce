import { Card } from '@/components/admin/Card';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { FilterSelect, SearchInput, Tabs } from '@/components/admin/Filters';
import { PageHeader } from '@/components/admin/PageHeader';
import { PayBadge } from '@/components/admin/StatusBadges';
import { Pagination } from '@/components/ui/Pagination';
import { useListParams } from '@/hooks/useListParams';
import { useSeo } from '@/hooks/useSeo';
import { adminPaymentService } from '@/services/adminService';
import type { PaymentStatus } from '@/types';
import { type AdminPayment } from '@/types/admin';
import { formatDateTime, money } from '@/utils/format';
import { methodLabel } from '@/utils/order';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export function PaymentsPage() {
  useSeo({ title: 'Payments — Admin', noindex: true });
  const { get, set, page } = useListParams();
  const query = { q: get('q'), status: get('status'), method: get('method'), page, limit: 15 };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin', 'payments', query],
    queryFn: () => adminPaymentService.list(query),
    placeholderData: keepPreviousData,
  });
  const summary = data?.meta.summary ?? {};
  const columns: Column<AdminPayment>[] = [
    { header: 'Transaction ID', cell: (r) => <span className="block max-w-[180px] truncate font-mono text-xs text-slate-700" title={r.transactionId}>{r.transactionId}</span> },
    { header: 'Order ID', cell: (r) => <Link to={`/admin/orders/${r.orderId}`} className="font-semibold text-indigo-600 hover:underline">{r.orderNumber}</Link> },
    { header: 'Customer', cell: (r) => <div className="min-w-[130px]"><p className="text-slate-800">{r.customer.name}</p><p className="text-xs text-slate-500">{r.customer.email}</p></div> },
    { header: 'Amount', align: 'right', cell: (r) => <div className="tabular-nums"><span className="font-semibold text-slate-900">{money(r.amount)}</span>{r.refundedAmount > 0 && <span className="block text-xs text-slate-500">{money(r.refundedAmount)} refunded</span>}</div> },
    { header: 'Payment Method', cell: (r) => methodLabel(r.method, r.gateway) },
    { header: 'Payment Status', cell: (r) => <div><PayBadge status={r.status} />{r.failureReason && r.status === 'FAILED' && <p className="mt-1 max-w-[180px] truncate text-xs text-rose-600" title={r.failureReason}>{r.failureReason}</p>}</div> },
    { header: 'Date', cell: (r) => <span className="whitespace-nowrap text-slate-500">{formatDateTime(r.paidAt ?? r.createdAt)}</span> },
  ];
  const tabs: { value: PaymentStatus | ''; label: string; count?: number }[] = [
    { value: '', label: 'All' },
    { value: 'PENDING', label: 'Pending', count: summary.PENDING?.count ?? 0 },
    { value: 'PAID', label: 'Successful', count: summary.PAID?.count ?? 0 },
    { value: 'FAILED', label: 'Failed', count: summary.FAILED?.count ?? 0 },
    { value: 'REFUNDED', label: 'Refunded', count: summary.REFUNDED?.count ?? 0 },
    { value: 'PARTIALLY_REFUNDED', label: 'Partially Refunded', count: summary.PARTIALLY_REFUNDED?.count ?? 0 },
  ];
  return (
    <div>
      <PageHeader title="Payments" subtitle={summary.PAID ? `${money(summary.PAID.amount)} collected across ${summary.PAID.count} successful payments` : 'All payment transactions'} />
      <Card padded={false}>
        <div className="space-y-3 border-b border-slate-100 p-3">
          <Tabs value={query.status as PaymentStatus | ''} onChange={(status) => set({ status })} tabs={tabs} />
          <div className="flex flex-wrap gap-2">
            <SearchInput value={query.q} onChange={(q) => set({ q })} placeholder="Search transaction, order or customer" />
            <FilterSelect label="Method" value={query.method} onChange={(method) => set({ method })} options={[{ value: '', label: 'All methods' }, { value: 'upi', label: 'UPI' }, { value: 'card', label: 'Card' }, { value: 'netbanking', label: 'Net Banking' }, { value: 'wallet', label: 'Wallet' }, { value: 'cod', label: 'Cash on Delivery' }]} />
          </div>
        </div>
        <DataTable columns={columns} rows={data?.data} rowKey={(r) => r.id} loading={isLoading} fetching={isFetching} error={error} onRetry={() => void refetch()} empty="No payments match these filters" />
        {data && data.meta.pages > 1 && <div className="border-t border-slate-100 p-3"><Pagination page={page} pages={data.meta.pages} onChange={(p) => set({ page: String(p) })} /></div>}
      </Card>
    </div>
  );
}
