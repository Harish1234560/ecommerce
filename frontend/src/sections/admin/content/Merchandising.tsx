import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { SearchInput, Tabs } from '@/components/admin/Filters';
import { Badge, PageSpinner } from '@/components/ui/Feedback';
import { Checkbox } from '@/components/ui/Form';
import { Img } from '@/components/ui/Img';
import { Pagination } from '@/components/ui/Pagination';
import { adminProductService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type MerchandisingProduct } from '@/types/admin';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function Merchandising() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [flag, setFlag] = useState<'' | 'featured' | 'trending' | 'bestseller'>('featured');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', 'flags', q, flag, page],
    queryFn: () => adminProductService.list<MerchandisingProduct>({ q, flag, page, limit: 8, sort: 'sales' }),
    placeholderData: keepPreviousData,
  });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Pick<MerchandisingProduct, 'featured' | 'isTrending' | 'isBestSeller'>> }) => adminProductService.patch(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      void qc.invalidateQueries({ queryKey: ['home'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  return (
    <Card title="Featured & trending products" subtitle="Pick the products shown in the homepage product sections" padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
        <Tabs value={flag} onChange={(f) => { setFlag(f); setPage(1); }} tabs={[{ value: 'featured' as const, label: 'Featured' }, { value: 'trending' as const, label: 'Trending' }, { value: 'bestseller' as const, label: 'Best seller' }, { value: '' as const, label: 'All products' }]} />
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search products" />
      </div>
      {isLoading ? <PageSpinner /> : (
        <ul className="divide-y divide-slate-100">
          {data?.data.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
              <Img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{p.name}{p.status !== 'ACTIVE' && <Badge className="ml-2">Hidden</Badge>}</span>
              <Checkbox label="Featured" checked={p.featured} onChange={(e) => patch.mutate({ id: p.id, body: { featured: e.target.checked } })} />
              <Checkbox label="Trending" checked={p.isTrending} onChange={(e) => patch.mutate({ id: p.id, body: { isTrending: e.target.checked } })} />
              <Checkbox label="Best seller" checked={p.isBestSeller} onChange={(e) => patch.mutate({ id: p.id, body: { isBestSeller: e.target.checked } })} />
            </li>
          ))}
          {data?.data.length === 0 && <li className="px-5 py-10 text-center text-sm text-slate-500">No products here. Switch to “All products” to add some.</li>}
        </ul>
      )}
      {data && data.meta.pages > 1 && <div className="border-t border-slate-100 p-3"><Pagination page={page} pages={data.meta.pages} onChange={setPage} /></div>}
    </Card>
  );
}
