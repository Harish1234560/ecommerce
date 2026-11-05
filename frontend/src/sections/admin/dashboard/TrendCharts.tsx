import { ChartCard, TimeChart } from '@/components/admin/charts';
import { type AnalyticsData } from '@/types/admin';
import { bucketLabel } from '@/utils/dateRange';
import { compactMoney, money } from '@/utils/format';

export function TrendCharts({ data }: { data: AnalyticsData }) {
  const label = bucketLabel(data.range.unit);
  const rows = data.series;
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <ChartCard title="Revenue" subtitle={`${money(data.stats.revenue)} in this period`} className="xl:col-span-3" table={{ columns: ['Date', 'Revenue'], rows: rows.map((r) => [label(r.date), money(r.revenue)]) }}>
        <TimeChart data={rows} dataKey="revenue" kind="area" name="revenue" format={money} axisFormat={compactMoney} labelFormat={label} height={260} />
      </ChartCard>
      <ChartCard title="Orders" subtitle={`${data.stats.orders} orders`} className="xl:col-span-2" table={{ columns: ['Date', 'Orders'], rows: rows.map((r) => [label(r.date), r.orders]) }}>
        <TimeChart data={rows} dataKey="orders" kind="bar" name="orders" format={(v) => String(v)} labelFormat={label} height={220} />
      </ChartCard>
      <ChartCard title="New customers" subtitle={`${data.stats.newCustomers} registered`} table={{ columns: ['Date', 'Customers'], rows: rows.map((r) => [label(r.date), r.customers]) }}>
        <TimeChart data={rows} dataKey="customers" kind="bar" name="new customers" format={(v) => String(v)} labelFormat={label} height={220} />
      </ChartCard>
    </div>
  );
}
