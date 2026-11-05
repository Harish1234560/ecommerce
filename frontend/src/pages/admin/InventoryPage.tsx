import { Card } from '@/components/admin/Card';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { SearchInput, Tabs } from '@/components/admin/Filters';
import { PageHeader } from '@/components/admin/PageHeader';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { Pagination } from '@/components/ui/Pagination';
import { useListParams } from '@/hooks/useListParams';
import { useSeo } from '@/hooks/useSeo';
import { AdjustModal } from '@/sections/admin/inventory/AdjustModal';
import { HistoryModal } from '@/sections/admin/inventory/HistoryModal';
import { adminInventoryService } from '@/services/adminService';
import { type InventoryRow } from '@/types/admin';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useState } from 'react';

export function InventoryPage() {
  useSeo({ title: 'Inventory — Admin', noindex: true });
  const { get, set, page } = useListParams();
  const filter = get('filter', 'all') as 'all' | 'low' | 'out';
  const q = get('q');
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);
  const [history, setHistory] = useState<InventoryRow | null>(null);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin', 'inventory', filter, q, page],
    queryFn: () => adminInventoryService.list({ filter, q, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<InventoryRow>[] = [
    {
      header: 'Product',
      cell: (r) => (
        <div className="flex min-w-[200px] items-center gap-3">
          <Img src={r.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
          <div><p className="font-medium text-slate-900">{r.name}</p>{r.variantLabel && <p className="text-xs text-slate-500">{r.variantLabel}</p>}</div>
        </div>
      ),
    },
    { header: 'SKU', cell: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { header: 'Current Stock', align: 'right', cell: (r) => <span className="tabular-nums">{r.stock}</span> },
    { header: 'Reserved Stock', align: 'right', cell: (r) => <span className="tabular-nums">{r.reserved}</span> },
    { header: 'Available Stock', align: 'right', cell: (r) => <span className={clsx('font-semibold tabular-nums', r.isOut ? 'text-rose-600' : r.isLow ? 'text-amber-700' : 'text-slate-900')}>{r.available}</span> },
    { header: 'Low Stock', cell: (r) => (r.isOut ? <Badge tone="danger">Out of stock</Badge> : r.isLow ? <Badge tone="warning">Low (≤ {r.lowStockThreshold})</Badge> : <Badge tone="success">OK</Badge>) },
    {
      header: 'Actions',
      align: 'right',
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" className="h-8" onClick={() => setAdjusting(r)}>Adjust</Button>
          <button onClick={() => setHistory(r)} aria-label="Stock history" title="Stock history" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><History className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock on hand, reserved by open orders, and available to sell" />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
          <Tabs value={filter} onChange={(v) => set({ filter: v === 'all' ? '' : v })} tabs={[{ value: 'all', label: 'All items' }, { value: 'low', label: 'Low stock' }, { value: 'out', label: 'Out of stock' }]} />
          <SearchInput value={q} onChange={(v) => set({ q: v })} placeholder="Search product or SKU" />
        </div>
        <DataTable columns={columns} rows={data?.data} rowKey={(r) => r.id} loading={isLoading} fetching={isFetching} error={error} onRetry={() => void refetch()} empty={filter === 'all' ? 'No inventory items' : 'Nothing here — stock levels look healthy'} />
        {data && data.meta.pages > 1 && <div className="border-t border-slate-100 p-3"><Pagination page={page} pages={data.meta.pages} onChange={(p) => set({ page: String(p) })} /></div>}
      </Card>
      {adjusting && <AdjustModal row={adjusting} onClose={() => setAdjusting(null)} />}
      {history && <HistoryModal row={history} onClose={() => setHistory(null)} />}
    </div>
  );
}
