import { Card } from '@/components/admin/Card';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatTile } from '@/components/admin/StatTile';
import { OrderBadge } from '@/components/admin/StatusBadges';
import { clsx } from '@/components/ui';
import { ErrorState } from '@/components/ui/Feedback';
import { useSeo } from '@/hooks/useSeo';
import { RangeFilter } from '@/sections/admin/dashboard/RangeFilter';
import { SalesBreakdown } from '@/sections/admin/dashboard/SalesBreakdown';
import { TrendCharts } from '@/sections/admin/dashboard/TrendCharts';
import { adminAnalyticsService } from '@/services/adminService';
import { type DateRange } from '@/types/admin';
import { defaultRange, rangeParams } from '@/utils/dateRange';
import { compactMoney, formatDate, money, timeAgo } from '@/utils/format';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Boxes, Clock, IndianRupee, Package, RotateCcw, ShoppingCart, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  useSeo({ title: 'Admin Dashboard', noindex: true });
  const [range, setRange] = useState<DateRange>(defaultRange);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin', 'dashboard', rangeParams(range)],
    queryFn: () => adminAnalyticsService.dashboard(rangeParams(range)),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={data ? `${formatDate(data.range.from)} – ${formatDate(data.range.to)}` : 'Store overview'} actions={<RangeFilter value={range} onChange={setRange} />} />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <div className={clsx('space-y-4 transition-opacity', isFetching && !isLoading && 'opacity-60')}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
            <StatTile loading={isLoading} label="Total Revenue" value={data ? compactMoney(data.stats.revenue) : ''} hint="in selected period" icon={<IndianRupee />} />
            <StatTile loading={isLoading} label="Total Orders" value={data?.stats.orders} hint="in selected period" icon={<ShoppingCart />} />
            <StatTile loading={isLoading} label="Total Customers" value={data?.totals.customers} hint={data ? `${data.stats.newCustomers} new in period` : ''} icon={<Users />} />
            <StatTile loading={isLoading} label="Total Products" value={data?.totals.products} hint="in catalogue" icon={<Package />} />
            <StatTile loading={isLoading} label="Pending Orders" value={data?.totals.pendingOrders} hint={<Link to="/admin/orders?status=PENDING" className="font-medium text-indigo-600 hover:underline">Review now</Link>} icon={<Clock />} tone={data?.totals.pendingOrders ? 'warning' : 'default'} />
            <StatTile loading={isLoading} label="Low Stock" value={data?.totals.lowStock} hint={<Link to="/admin/inventory?filter=low" className="font-medium text-indigo-600 hover:underline">View items</Link>} icon={<Boxes />} tone={data?.totals.lowStock ? 'danger' : 'default'} />
            <StatTile loading={isLoading} label="Refunds" value={data?.totals.openRefunds} hint={data ? `open · ${money(data.stats.refundAmount)} refunded` : ''} icon={<RotateCcw />} tone={data?.totals.openRefunds ? 'warning' : 'default'} />
          </div>

          {data && (
            <>
              <TrendCharts data={data} />
              <SalesBreakdown data={data} />
              <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                <Card title="Recent orders" padded={false} actions={<Link to="/admin/orders" className="text-xs font-semibold text-indigo-600 hover:underline">View all</Link>}>
                  <ul className="divide-y divide-slate-100">
                    {data.recentOrders.map((o) => (
                      <li key={o.id}>
                        <Link to={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-slate-50">
                          <span className="w-24 text-sm font-semibold text-slate-900">{o.orderNumber}</span>
                          <span className="min-w-[8rem] flex-1 truncate text-sm text-slate-600">{o.customer}</span>
                          <span className="text-xs text-slate-400">{timeAgo(o.createdAt)}</span>
                          <OrderBadge status={o.status} />
                          <span className="ml-auto w-20 text-right text-sm font-semibold tabular-nums text-slate-900">{money(o.total)}</span>
                        </Link>
                      </li>
                    ))}
                    {data.recentOrders.length === 0 && <li className="px-5 py-10 text-center text-sm text-slate-500">No orders yet</li>}
                  </ul>
                </Card>
                <Card title="Low stock" padded={false} actions={<Link to="/admin/inventory?filter=low" className="text-xs font-semibold text-indigo-600 hover:underline">Manage</Link>}>
                  <ul className="divide-y divide-slate-100">
                    {data.lowStockItems.map((i) => (
                      <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                        <AlertTriangle className={clsx('h-4 w-4 shrink-0', i.available <= 0 ? 'text-rose-500' : 'text-amber-500')} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">{i.name}</span>
                          <span className="text-xs text-slate-500">{i.sku}{[i.size, i.color].filter(Boolean).length > 0 && ` · ${[i.size, i.color].filter(Boolean).join(' / ')}`}</span>
                        </span>
                        <span className={clsx('text-sm font-semibold tabular-nums', i.available <= 0 ? 'text-rose-600' : 'text-amber-700')}>{i.available <= 0 ? 'Out' : `${i.available} left`}</span>
                      </li>
                    ))}
                    {data.lowStockItems.length === 0 && <li className="px-5 py-10 text-center text-sm text-slate-500">All items are well stocked</li>}
                  </ul>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
