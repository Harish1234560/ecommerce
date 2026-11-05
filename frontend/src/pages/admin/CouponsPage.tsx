import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Feedback';
import { Toggle } from '@/components/ui/Form';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useSeo } from '@/hooks/useSeo';
import { CouponModal } from '@/sections/admin/coupons/CouponModal';
import { couponState } from '@/sections/admin/coupons/couponState';
import { adminCouponService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type AdminCoupon } from '@/types/admin';
import { formatDate, money } from '@/utils/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function CouponsPage() {
  useSeo({ title: 'Coupons — Admin', noindex: true });
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'coupons'], queryFn: () => adminCouponService.list() });
  const [editing, setEditing] = useState<AdminCoupon | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    void qc.invalidateQueries({ queryKey: ['offers'] });
    void qc.invalidateQueries({ queryKey: ['home'] });
  };
  const toggle = useMutation({ mutationFn: (c: AdminCoupon) => adminCouponService.setActive(c.id, !c.isActive), onSuccess: refresh, onError: (err) => toast.error(errorMessage(err)) });
  const remove = useMutation({
    mutationFn: (id: string) => adminCouponService.remove(id),
    onSuccess: () => { toast.success('Coupon deleted'); setDeleting(null); refresh(); },
    onError: (err) => { toast.error(errorMessage(err)); setDeleting(null); },
  });

  const columns: Column<AdminCoupon>[] = [
    { header: 'Code', cell: (c) => <div><p className="font-mono text-sm font-bold text-slate-900">{c.code}</p>{c.description && <p className="max-w-[220px] truncate text-xs text-slate-500">{c.description}</p>}</div> },
    { header: 'Discount', cell: (c) => <div><p className="font-semibold text-slate-900">{c.discountType === 'PERCENTAGE' ? `${c.value}% off` : `${money(c.value)} off`}</p><p className="text-xs text-slate-500">{c.minOrder > 0 ? `Min ${money(c.minOrder)}` : 'No minimum'}{c.maxDiscount != null && ` · Max ${money(c.maxDiscount)}`}</p></div> },
    { header: 'Applies to', cell: (c) => <span className="text-xs text-slate-600">{c.categories.length + c.products.length === 0 ? 'Everything' : [...c.categories.map((x) => x.name), ...c.products.map((x) => x.name)].slice(0, 3).join(', ') + (c.categories.length + c.products.length > 3 ? '…' : '')}</span> },
    { header: 'Validity', cell: (c) => <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(c.startsAt)} – {c.expiresAt ? formatDate(c.expiresAt) : 'no expiry'}</span> },
    { header: 'Usage', align: 'right', cell: (c) => <div className="tabular-nums"><span className="font-semibold text-slate-900">{c.usedCount}</span><span className="text-slate-500"> / {c.usageLimit ?? '∞'}</span>{c.perUserLimit != null && <span className="block text-xs text-slate-500">{c.perUserLimit} per user</span>}</div> },
    { header: 'Status', cell: (c) => { const s = couponState(c); return <div className="flex items-center gap-2"><Toggle label={`${c.code} active`} checked={c.isActive} disabled={toggle.isPending} onChange={() => toggle.mutate(c)} /><Badge tone={s.tone}>{s.label}</Badge></div>; } },
    { header: 'Actions', align: 'right', cell: (c) => <div className="flex justify-end gap-1"><button onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button><button onClick={() => setDeleting(c)} aria-label={`Delete ${c.code}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div> },
  ];
  return (
    <div>
      <PageHeader title="Coupons" subtitle="Discount codes customers can apply in the cart" actions={<Button size="sm" onClick={() => setEditing(null)} icon={<Plus className="h-4 w-4" />}>New coupon</Button>} />
      <Card padded={false}>
        <DataTable columns={columns} rows={data} rowKey={(c) => c.id} loading={isLoading} error={error} onRetry={() => void refetch()} empty="No coupons yet — create one to run a promotion" />
      </Card>
      {editing !== undefined && <CouponModal coupon={editing} onClose={() => setEditing(undefined)} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending} danger title="Delete coupon?" confirmLabel="Delete" message={<>Coupon <strong>{deleting?.code}</strong> will be deleted. Coupons that were already used on orders can only be deactivated.</>} />
    </div>
  );
}
