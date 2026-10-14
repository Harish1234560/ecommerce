import { Card } from '@/components/admin/Card';
import { clsx } from '@/components/ui';
import { BarChart3, Table2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// One series per chart, one hue (validated against the white card surface), thin marks,
// hairline solid grid, text in ink tokens — and every chart has a table twin.

const SERIES = '#2a78d6';

const GRID = '#e2e8f0';

const MUTED = '#64748b';

export function ChartCard({ title, subtitle, children, table, className }: { title: string; subtitle?: string; children: ReactNode; table: { columns: string[]; rows: (string | number)[][] }; className?: string }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card
      title={title}
      subtitle={subtitle}
      className={className}
      actions={
        <button onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          {asTable ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
          {asTable ? 'Chart' : 'Table'}
        </button>
      }
    >
      {asTable ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {table.columns.map((c, i) => <th key={c} scope="col" className={clsx('py-2', i > 0 && 'text-right')}>{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.rows.length === 0 && <tr><td colSpan={table.columns.length} className="py-6 text-center text-slate-500">No data for this period</td></tr>}
              {table.rows.map((r, i) => (
                <tr key={i}>{r.map((v, j) => <td key={j} className={clsx('py-2 text-slate-700', j > 0 && 'text-right tabular-nums')}>{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

function ChartTooltip({ active, payload, label, format, name, labelFormat }: { active?: boolean; payload?: { value?: number }[]; label?: string; format: (v: number) => string; name: string; labelFormat: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-slate-500">{labelFormat(label ?? '')}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <span className="h-2 w-2 rounded-full" style={{ background: SERIES }} />
        {format(payload[0]?.value ?? 0)} <span className="font-normal text-slate-500">{name}</span>
      </p>
    </div>
  );
}

// Single-series trend: an area (line + light wash) or thin columns, with a hover crosshair/tooltip.
export function TimeChart({ data, dataKey, kind, format, axisFormat, name, labelFormat, height = 240 }: { data: Record<string, string | number>[]; dataKey: string; kind: 'area' | 'bar'; format: (v: number) => string; axisFormat?: (v: number) => string; name: string; labelFormat: (l: string) => string; height?: number }) {
  if (data.length === 0 || data.every((d) => !d[dataKey])) {
    return <div className="flex items-center justify-center text-sm text-slate-500" style={{ height }}>No data for this period</div>;
  }
  const axis = { tick: { fontSize: 11, fill: MUTED }, tickLine: false, axisLine: false };
  const common = { data, margin: { top: 8, right: 8, bottom: 0, left: 0 } };
  const x = <XAxis dataKey="date" {...axis} axisLine={{ stroke: '#cbd5e1' }} tickFormatter={labelFormat} minTickGap={28} />;
  const y = <YAxis {...axis} width={52} tickFormatter={axisFormat ?? format} allowDecimals={false} />;
  const grid = <CartesianGrid vertical={false} stroke={GRID} />;
  const tip = <Tooltip cursor={kind === 'area' ? { stroke: '#94a3b8', strokeWidth: 1 } : { fill: '#f1f5f9' }} content={<ChartTooltip format={format} name={name} labelFormat={labelFormat} />} />;
  return (
    <div style={{ height }} role="img" aria-label={`${name} over time`}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'area' ? (
          <AreaChart {...common}>
            {grid}{x}{y}{tip}
            <Area type="monotone" dataKey={dataKey} stroke={SERIES} strokeWidth={2} fill={SERIES} fillOpacity={0.1} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} dot={data.length === 1 ? { r: 4, fill: SERIES } : false} isAnimationActive={false} />
          </AreaChart>
        ) : (
          <BarChart {...common} barCategoryGap="20%">
            {grid}{x}{y}{tip}
            <Bar dataKey={dataKey} fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// Ranked horizontal bars with the value written at the bar tip (one hue: the categories are nominal).
export function BarList({ items, format, empty = 'No data for this period' }: { items: { label: string; value: number; sub?: string }[]; format: (v: number) => string; empty?: string }) {
  if (items.length === 0) return <p className="py-8 text-center text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} title={`${item.label}: ${format(item.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{item.label}{item.sub && <span className="ml-1.5 text-xs text-slate-400">{item.sub}</span>}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{format(item.value)}</span>
          </div>
          <div className="h-2.5 rounded-r bg-slate-100">
            <div className="h-full rounded-r" style={{ width: `${Math.max((item.value / max) * 100, 1.5)}%`, background: SERIES }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
