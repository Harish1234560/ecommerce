import { Card } from '@/components/admin/Card';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { FilterSelect, SearchInput, Tabs } from '@/components/admin/Filters';
import { PageHeader } from '@/components/admin/PageHeader';
import { OrderBadge, PayBadge } from '@/components/admin/StatusBadges';
import { Button, buttonClass } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useListParams } from '@/hooks/useListParams';
import { useSeo } from '@/hooks/useSeo';
import { ORDER_TABS, statusLabel } from '@/sections/admin/orders/labels';
import { adminOrderService } from '@/services/adminService';
import type { OrderStatus } from '@/types';
import { type AdminOrderRow } from '@/types/admin';
import { formatDateTime, money } from '@/utils/format';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function OrdersPage() {
  useSeo({ title: 'Orders — Admin', noindex: true });
  const navigate = useNavigate();
  const { get, set, page } = useListParams();
  const query = { q: get('q'), status: get('status'), method: get('method'), customerId: get('customerId'), page, limit: 15 };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin', 'orders', query],
    queryFn: () => adminOrderService.list(query),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const counts = data?.meta.statusCounts ?? {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);

  const columns: Column<AdminOrderRow>[] = [
    { header: 'Order', cell: (r) => <span className="font-semibold text-slate-900">{r.orderNumber}</span> },
    { header: 'Date', cell: (r) => <span className="whitespace-nowrap text-slate-500">{formatDateTime(r.createdAt)}</span> },
    { header: 'Customer', cell: (r) => <div className="min-w-[140px]"><p className="font-medium text-slate-800">{r.customer.name}</p><p className="text-xs text-slate-500">{r.customer.email}</p></div> },
    { header: 'Items', align: 'right', cell: (r) => r.itemCount },
    { header: 'Amount', align: 'right', cell: (r) => <span className="font-semibold tabular-nums text-slate-900">{money(r.total)}</span> },
    { header: 'Payment', cell: (r) => <div className="flex flex-col items-start gap-1"><PayBadge status={r.paymentStatus} /><span className="text-xs text-slate-500">{r.paymentMethod === 'COD' ? 'COD' : 'Online'}</span></div> },
    { header: 'Status', cell: (r) => <OrderBadge status={r.status} /> },
    { header: 'Actions', align: 'right', cell: (r) => <Link to={`/admin/orders/${r.id}`} onClick={(e) => e.stopPropagation()} className={buttonClass('outline', 'sm')}><Eye className="h-4 w-4" /> View</Link> },
  ];

  return (
    <div>
      <PageHeader title="Orders" subtitle={data ? `${data.meta.total} order${data.meta.total === 1 ? '' : 's'}${query.customerId ? ' for this customer' : ''}` : undefined} />
      <Card padded={false}>
        <div className="space-y-3 border-b border-slate-100 p-3">
          <Tabs value={query.status as OrderStatus | ''} onChange={(status) => set({ status })} tabs={[{ value: '' as const, label: 'All', count: all }, ...ORDER_TABS.map((s) => ({ value: s, label: statusLabel(s), count: counts[s] ?? 0 }))]} />
          <div className="flex flex-wrap gap-2">
            <SearchInput value={query.q} onChange={(q) => set({ q })} placeholder="Search order no., name, email, phone" />
            <FilterSelect label="Payment method" value={query.method} onChange={(method) => set({ method })} options={[{ value: '', label: 'All payment methods' }, { value: 'ONLINE', label: 'Online' }, { value: 'COD', label: 'Cash on Delivery' }]} />
            {query.customerId && <Button size="sm" variant="outline" onClick={() => set({ customerId: '' })}>Clear customer filter</Button>}
          </div>
        </div>
        <DataTable columns={columns} rows={data?.data} rowKey={(r) => r.id} loading={isLoading} fetching={isFetching} error={error} onRetry={() => void refetch()} empty="No orders match these filters" onRowClick={(r) => navigate(`/admin/orders/${r.id}`)} />
        {data && data.meta.pages > 1 && <div className="border-t border-slate-100 p-3"><Pagination page={page} pages={data.meta.pages} onChange={(p) => set({ page: String(p) })} /></div>}
      </Card>
    </div>
  );
}
