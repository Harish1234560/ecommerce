import { BarList, ChartCard } from '@/components/admin/charts';
import { type AnalyticsData } from '@/types/admin';
import { money } from '@/utils/format';

export function SalesBreakdown({ data }: { data: AnalyticsData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Product sales" subtitle="Top products by units sold" table={{ columns: ['Product', 'Units', 'Revenue'], rows: data.topProducts.map((p) => [p.name, p.quantity, money(p.revenue)]) }}>
        <BarList items={data.topProducts.map((p) => ({ label: p.name, value: p.quantity, sub: money(p.revenue) }))} format={(v) => `${v} sold`} />
      </ChartCard>
      <ChartCard title="Category sales" subtitle="Revenue by category" table={{ columns: ['Category', 'Units', 'Revenue'], rows: data.categorySales.map((c) => [c.name, c.quantity, money(c.revenue)]) }}>
        <BarList items={data.categorySales.map((c) => ({ label: c.name, value: c.revenue, sub: `${c.quantity} units` }))} format={money} />
      </ChartCard>
    </div>
  );
}
