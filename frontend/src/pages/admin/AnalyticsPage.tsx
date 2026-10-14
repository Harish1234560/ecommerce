import { Card } from '@/components/admin/Card';
import { BarList, ChartCard } from '@/components/admin/charts';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatTile } from '@/components/admin/StatTile';
import { clsx } from '@/components/ui';
import { ErrorState } from '@/components/ui/Feedback';
import { ORDER_STATUS, PAYMENT_METHOD_LABEL, REFUND_STATUS } from '@/constants';
import { useSeo } from '@/hooks/useSeo';
import { RangeFilter } from '@/sections/admin/dashboard/RangeFilter';
import { SalesBreakdown } from '@/sections/admin/dashboard/SalesBreakdown';
import { TrendCharts } from '@/sections/admin/dashboard/TrendCharts';
import { adminAnalyticsService } from '@/services/adminService';
import { type DateRange } from '@/types/admin';
import { defaultRange, rangeParams } from '@/utils/dateRange';
import { compactMoney, formatDate, money } from '@/utils/format';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { IndianRupee, RotateCcw, ShoppingCart, Users } from 'lucide-react';
import { useState } from 'react';

export function AnalyticsPage() {
  useSeo({ title: 'Analytics', noindex: true });
  const [range, setRange] = useState<DateRange>(defaultRange);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin', 'analytics', rangeParams(range)],
    queryFn: () => adminAnalyticsService.analytics(rangeParams(range)),
    placeholderData: keepPreviousData,
  });

  const methodLabel = (m: string) => PAYMENT_METHOD_LABEL[m] ?? m.charAt(0).toUpperCase() + m.slice(1);
  return (
    <div>
      <PageHeader title="Analytics" subtitle={data ? `${formatDate(data.range.from)} – ${formatDate(data.range.to)}` : 'Sales performance'} actions={<RangeFilter value={range} onChange={setRange} />} />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <div className={clsx('space-y-4 transition-opacity', isFetching && !isLoading && 'opacity-60')}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatTile loading={isLoading} label="Revenue" value={data ? compactMoney(data.stats.revenue) : ''} icon={<IndianRupee />} />
            <StatTile loading={isLoading} label="Orders" value={data?.stats.orders} icon={<ShoppingCart />} />
            <StatTile loading={isLoading} label="Average order value" value={data ? money(data.stats.averageOrderValue) : ''} />
            <StatTile loading={isLoading} label="New customers" value={data?.stats.newCustomers} icon={<Users />} />
            <StatTile loading={isLoading} label="Buyer conversion" value={data ? `${data.stats.conversionRate}%` : ''} hint={data ? `${data.stats.buyers} of all customers ordered` : ''} />
            <StatTile loading={isLoading} label="Refund amount" value={data ? money(data.stats.refundAmount) : ''} hint={data ? `${data.stats.refundCount} refund request${data.stats.refundCount === 1 ? '' : 's'}` : ''} icon={<RotateCcw />} />
          </div>

          {data && (
            <>
              <TrendCharts data={data} />
              <SalesBreakdown data={data} />
              <div className="grid gap-4 lg:grid-cols-3">
                <ChartCard title="Payment methods" subtitle="Amount collected or due" table={{ columns: ['Method', 'Payments', 'Amount'], rows: data.paymentMethods.map((p) => [methodLabel(p.method), p.count, money(p.amount)]) }}>
                  <BarList items={data.paymentMethods.map((p) => ({ label: methodLabel(p.method), value: p.amount, sub: `${p.count} payment${p.count === 1 ? '' : 's'}` }))} format={money} />
                </ChartCard>
                <ChartCard title="Orders by status" subtitle="Orders placed in this period" table={{ columns: ['Status', 'Orders'], rows: data.statusBreakdown.map((s) => [ORDER_STATUS[s.status]?.label ?? s.status, s.count]) }}>
                  <BarList items={[...data.statusBreakdown].sort((a, b) => b.count - a.count).map((s) => ({ label: s.status === 'PENDING' ? 'Pending' : (ORDER_STATUS[s.status]?.label ?? s.status), value: s.count }))} format={(v) => String(v)} />
                </ChartCard>
                <Card title="Coupon usage" subtitle="Redemptions in this period" padded={false}>
                  {data.couponUsage.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-slate-500">No coupons were used</p>
                  ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5">Code</th><th className="py-2.5 text-right">Uses</th><th className="px-5 py-2.5 text-right">Discount given</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.couponUsage.map((c) => (
                          <tr key={c.code}><td className="px-5 py-2.5 font-semibold text-slate-800">{c.code}</td><td className="py-2.5 text-right tabular-nums">{c.uses}</td><td className="px-5 py-2.5 text-right tabular-nums">{money(c.discount)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </Card>
              </div>
              <Card title="Refunds" subtitle="Requests created in this period">
                {data.refunds.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">No refund requests</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {data.refunds.map((r) => (
                      <div key={r.status}>
                        <dt className="text-xs text-slate-500">{REFUND_STATUS[r.status]?.label ?? r.status}</dt>
                        <dd className="mt-0.5 text-lg font-semibold text-slate-900">{r.count}<span className="ml-2 text-sm font-normal text-slate-500">{money(r.amount)}</span></dd>
                      </div>
                    ))}
                  </dl>
                )}
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
