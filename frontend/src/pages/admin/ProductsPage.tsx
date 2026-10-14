import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { FilterSelect, SearchInput } from '@/components/admin/Filters';
import { PageHeader } from '@/components/admin/PageHeader';
import { clsx } from '@/components/ui';
import { Button, buttonClass } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Feedback';
import { Toggle } from '@/components/ui/Form';
import { Img } from '@/components/ui/Img';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useListParams } from '@/hooks/useListParams';
import { useSeo } from '@/hooks/useSeo';
import { adminProductService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type AdminProductRow } from '@/types/admin';
import { money } from '@/utils/format';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const STATUS_TONE = { ACTIVE: 'success', INACTIVE: 'neutral', DRAFT: 'warning' } as const;

export function ProductsPage() {
  useSeo({ title: 'Products — Admin', noindex: true });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { get, set } = useListParams();
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<AdminProductRow | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const { data: categories } = useAdminCategories();

  const query = { q: get('q'), category: get('category'), status: get('status'), stock: get('stock'), sort: get('sort', 'newest'), page: get('page', '1'), limit: '15' };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin', 'products', query],
    queryFn: () => adminProductService.list(query),
    placeholderData: keepPreviousData,
  });
  const rows = data?.data ?? [];
  const refresh = () => {
    setSelected([]);
    void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
  };

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Pick<AdminProductRow, 'status' | 'featured'>> }) => adminProductService.patch(id, body),
    onSuccess: refresh,
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminProductService.remove(id),
    onSuccess: () => {
      toast.success('Product deleted');
      setDeleting(null);
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const bulk = useMutation({
    mutationFn: (action: string) => adminProductService.bulk(selected, action),
    onSuccess: (res, action) => {
      toast.success(`${res.affected} product${res.affected === 1 ? '' : 's'} ${action === 'delete' ? 'deleted' : 'updated'}`);
      setBulkDelete(false);
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const columns: Column<AdminProductRow>[] = [
    {
      header: 'Select',
      className: 'w-10',
      cell: (r) => <input type="checkbox" aria-label={`Select ${r.name}`} className="h-4 w-4 accent-indigo-600" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} onClick={(e) => e.stopPropagation()} />,
    },
    { header: 'Image', className: 'w-16', cell: (r) => <Img src={r.image} alt="" className="h-11 w-11 rounded-lg object-cover" /> },
    {
      header: 'Product',
      cell: (r) => (
        <div className="min-w-[180px]">
          <Link to={`/admin/products/${r.id}/edit`} className="font-medium text-slate-900 hover:text-indigo-600">{r.name}</Link>
          <p className="text-xs text-slate-500">SKU {r.sku}{r.hasVariants && ' · has variants'}{r.featured && ' · featured'}</p>
        </div>
      ),
    },
    { header: 'Category', cell: (r) => r.category.name },
    {
      header: 'Price',
      align: 'right',
      cell: (r) => (
        <div className="tabular-nums">
          <span className="font-semibold text-slate-900">{money(r.sellingPrice)}</span>
          {r.discountPercent > 0 && <span className="block text-xs text-slate-400 line-through">{money(r.price)}</span>}
        </div>
      ),
    },
    { header: 'Stock', align: 'right', cell: (r) => <span className={clsx('font-semibold tabular-nums', r.stock <= 0 ? 'text-rose-600' : r.stock <= 10 ? 'text-amber-700' : 'text-slate-900')}>{r.stock <= 0 ? 'Out of stock' : r.stock}</span> },
    {
      header: 'Status',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Toggle label={`${r.name} active`} checked={r.status === 'ACTIVE'} disabled={patch.isPending} onChange={(on) => patch.mutate({ id: r.id, body: { status: on ? 'ACTIVE' : 'INACTIVE' } })} />
          <Badge tone={STATUS_TONE[r.status]}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge>
        </div>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <a href={`/product/${r.slug}`} target="_blank" rel="noreferrer" aria-label="View on storefront" title="View on storefront" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><ExternalLink className="h-4 w-4" /></a>
          <button onClick={() => navigate(`/admin/products/${r.id}/edit`)} aria-label={`Edit ${r.name}`} title="Edit" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => setDeleting(r)} aria-label={`Delete ${r.name}`} title="Delete" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Products" subtitle={data ? `${data.meta.total} product${data.meta.total === 1 ? '' : 's'}` : undefined} actions={<Link to="/admin/products/new" className={buttonClass('primary', 'sm')}><Plus className="h-4 w-4" /> Add product</Link>} />
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <SearchInput value={query.q} onChange={(q) => set({ q })} placeholder="Search name, SKU or brand" />
          <FilterSelect label="Category" value={query.category} onChange={(category) => set({ category })} options={[{ value: '', label: 'All categories' }, ...(categories ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
          <FilterSelect label="Status" value={query.status} onChange={(status) => set({ status })} options={[{ value: '', label: 'All statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }, { value: 'DRAFT', label: 'Draft' }]} />
          <FilterSelect label="Stock" value={query.stock} onChange={(stock) => set({ stock })} options={[{ value: '', label: 'Any stock' }, { value: 'in', label: 'In stock' }, { value: 'low', label: 'Low (≤ 10)' }, { value: 'out', label: 'Out of stock' }]} />
          <FilterSelect label="Sort" value={query.sort} onChange={(sort) => set({ sort })} options={[{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'name', label: 'Name A–Z' }, { value: 'price_asc', label: 'Price ↑' }, { value: 'price_desc', label: 'Price ↓' }, { value: 'stock_asc', label: 'Stock ↑' }, { value: 'stock_desc', label: 'Stock ↓' }, { value: 'sales', label: 'Best selling' }]} />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-sm">
          <label className="flex items-center gap-2 font-medium text-slate-600">
            <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((r) => r.id))} />
            {selected.length > 0 ? `${selected.length} selected` : 'Select all on this page'}
          </label>
          {selected.length > 0 && (
            <div className="ml-auto flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" className="h-8" disabled={bulk.isPending} onClick={() => bulk.mutate('activate')}>Activate</Button>
              <Button size="sm" variant="outline" className="h-8" disabled={bulk.isPending} onClick={() => bulk.mutate('deactivate')}>Deactivate</Button>
              <Button size="sm" variant="outline" className="h-8" disabled={bulk.isPending} onClick={() => bulk.mutate('feature')}>Feature</Button>
              <Button size="sm" variant="outline" className="h-8" disabled={bulk.isPending} onClick={() => bulk.mutate('unfeature')}>Unfeature</Button>
              <Button size="sm" variant="danger" className="h-8" disabled={bulk.isPending} onClick={() => setBulkDelete(true)}>Delete</Button>
            </div>
          )}
        </div>

        <DataTable columns={columns} rows={data?.data} rowKey={(r) => r.id} loading={isLoading} fetching={isFetching} error={error} onRetry={() => void refetch()} empty="No products match these filters" />
        {data && data.meta.pages > 1 && <div className="border-t border-slate-100 p-3"><Pagination page={data.meta.page} pages={data.meta.pages} onChange={(p) => set({ page: String(p) })} /></div>}
      </Card>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending} danger title="Delete product?" confirmLabel="Delete" message={<>“{deleting?.name}” will be removed from the store, carts and wishlists. Past orders keep their record of it.</>} />
      <ConfirmDialog open={bulkDelete} onClose={() => setBulkDelete(false)} onConfirm={() => bulk.mutate('delete')} loading={bulk.isPending} danger title={`Delete ${selected.length} products?`} confirmLabel="Delete all" message="They will be removed from the store, carts and wishlists." />
    </div>
  );
}
