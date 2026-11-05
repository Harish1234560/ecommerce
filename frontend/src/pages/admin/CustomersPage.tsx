import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { FilterSelect, SearchInput } from '@/components/admin/Filters';
import { PageHeader } from '@/components/admin/PageHeader';
import { clsx } from '@/components/ui';
import { Button, buttonClass } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Feedback';
import { Toggle } from '@/components/ui/Form';
import { Pagination } from '@/components/ui/Pagination';
import { useListParams } from '@/hooks/useListParams';
import { useSeo } from '@/hooks/useSeo';
import { CustomerModal } from '@/sections/admin/customers/CustomerModal';
import { adminCustomerService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type AdminCustomer } from '@/types/admin';
import { formatDate, money } from '@/utils/format';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function CustomersPage() {
  useSeo({ title: 'Customers — Admin', noindex: true });
  const qc = useQueryClient();
  const { get, set, page } = useListParams();
  const [viewing, setViewing] = useState<string | null>(null);
  const query = { q: get('q'), status: get('status'), page, limit: 15 };
  const { data, isLoading, isFetching, error, refetch } = useQuery({ queryKey: ['admin', 'customers', query], queryFn: () => adminCustomerService.list(query), placeholderData: keepPreviousData });
  const toggle = useMutation({
    mutationFn: (c: AdminCustomer) => adminCustomerService.setActive(c.id, !c.isActive),
    onSuccess: (_r, c) => {
      toast.success(c.isActive ? 'Account disabled' : 'Account enabled');
      void qc.invalidateQueries({ queryKey: ['admin', 'customers'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const columns: Column<AdminCustomer>[] = [
    { header: 'Name', cell: (r) => <button onClick={() => setViewing(r.id)} className="font-medium text-slate-900 hover:text-indigo-600">{r.name}</button> },
    { header: 'Email', cell: (r) => r.email },
    { header: 'Phone', cell: (r) => (r.phone ? `+91 ${r.phone}` : '—') },
    { header: 'Orders', align: 'right', cell: (r) => <span className="tabular-nums">{r.orderCount}</span> },
    { header: 'Total spending', align: 'right', cell: (r) => <span className="font-semibold tabular-nums text-slate-900">{money(r.totalSpent)}</span> },
    { header: 'Registered', cell: (r) => <span className="whitespace-nowrap text-slate-500">{formatDate(r.createdAt)}</span> },
    { header: 'Account status', cell: (r) => <div className="flex items-center gap-2"><Toggle label={`${r.name} account active`} checked={r.isActive} disabled={toggle.isPending} onChange={() => toggle.mutate(r)} /><Badge tone={r.isActive ? 'success' : 'danger'}>{r.isActive ? 'Active' : 'Disabled'}</Badge></div> },
    { header: 'Actions', align: 'right', cell: (r) => <div className="flex justify-end gap-1.5"><Button size="sm" variant="outline" className="h-8" onClick={() => setViewing(r.id)}>View</Button><Link to={`/admin/orders?customerId=${r.id}`} className={clsx(buttonClass('ghost', 'sm'), 'h-8')}>Orders</Link></div> },
  ];
  return (
    <div>
      <PageHeader title="Customers" subtitle={data ? `${data.meta.total} customer${data.meta.total === 1 ? '' : 's'}` : undefined} />
      <Card padded={false}>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
          <SearchInput value={query.q} onChange={(q) => set({ q })} placeholder="Search name, email or phone" />
          <FilterSelect label="Account status" value={query.status} onChange={(status) => set({ status })} options={[{ value: '', label: 'All accounts' }, { value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }]} />
        </div>
        <DataTable columns={columns} rows={data?.data} rowKey={(r) => r.id} loading={isLoading} fetching={isFetching} error={error} onRetry={() => void refetch()} empty="No customers found" />
        {data && data.meta.pages > 1 && <div className="border-t border-slate-100 p-3"><Pagination page={page} pages={data.meta.pages} onChange={(p) => set({ page: String(p) })} /></div>}
      </Card>
      {viewing && <CustomerModal id={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
