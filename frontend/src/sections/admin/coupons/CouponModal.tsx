import { errorMessage } from '@/api/client';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Checkbox, fieldErrors, Input, Select } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { adminCouponService, adminProductService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type AdminCoupon } from '@/types/admin';
import { toLocalInput } from '@/utils/date';
import { toPaise, toRupees } from '@/utils/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

export function CouponModal({ coupon, onClose }: { coupon: AdminCoupon | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: categories } = useAdminCategories();
  const [productSearch, setProductSearch] = useState('');
  const products = useQuery({
    queryKey: ['admin', 'products', 'picker', productSearch],
    queryFn: () => adminProductService.list({ q: productSearch, limit: 8 }).then((r) => r.data),
    enabled: productSearch.trim().length >= 2,
  });
  const [form, setForm] = useState({
    code: coupon?.code ?? '',
    description: coupon?.description ?? '',
    discountType: coupon?.discountType ?? ('PERCENTAGE' as 'PERCENTAGE' | 'FIXED'),
    value: coupon ? (coupon.discountType === 'PERCENTAGE' ? String(coupon.value) : toRupees(coupon.value)) : '',
    minOrder: coupon ? toRupees(coupon.minOrder) : '',
    maxDiscount: toRupees(coupon?.maxDiscount),
    startsAt: toLocalInput(coupon?.startsAt ?? new Date().toISOString()),
    expiresAt: toLocalInput(coupon?.expiresAt ?? null),
    usageLimit: coupon?.usageLimit != null ? String(coupon.usageLimit) : '',
    perUserLimit: coupon?.perUserLimit != null ? String(coupon.perUserLimit) : '',
    isActive: coupon?.isActive ?? true,
    showOnOffers: coupon?.showOnOffers ?? true,
    notifyCustomers: false,
    categoryIds: coupon?.categories.map((c) => c.id) ?? [],
    products: coupon?.products ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };
  const percent = form.discountType === 'PERCENTAGE';

  const save = useMutation({
    mutationFn: () => {
      const body = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        discountType: form.discountType,
        value: percent ? Number(form.value) : toPaise(form.value),
        minOrder: toPaise(form.minOrder),
        maxDiscount: percent && form.maxDiscount ? toPaise(form.maxDiscount) : null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : null,
        isActive: form.isActive,
        showOnOffers: form.showOnOffers,
        notifyCustomers: !coupon && form.notifyCustomers,
        categoryIds: form.categoryIds,
        productIds: form.products.map((p) => p.id),
      };
      return coupon ? adminCouponService.update(coupon.id, body) : adminCouponService.create(body);
    },
    onSuccess: () => {
      toast.success(coupon ? 'Coupon updated' : 'Coupon created');
      void qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      void qc.invalidateQueries({ queryKey: ['offers'] });
      void qc.invalidateQueries({ queryKey: ['home'] });
      onClose();
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(form.code.trim())) next.code = 'Use 3–30 letters, numbers, - or _';
    if (!(Number(form.value) > 0)) next.value = 'Enter a discount value';
    else if (percent && Number(form.value) > 100) next.value = 'A percentage cannot exceed 100';
    if (form.expiresAt && form.startsAt && new Date(form.expiresAt) <= new Date(form.startsAt)) next.expiresAt = 'Expiry must be after the start date';
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate();
  };

  return (
    <Modal open onClose={onClose} title={coupon ? `Edit coupon ${coupon.code}` : 'New coupon'} size="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Coupon Code" required className="uppercase" placeholder="WELCOME10" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} error={errors.code} />
          <Select label="Discount Type" value={form.discountType} onChange={(e) => set('discountType', e.target.value as 'PERCENTAGE' | 'FIXED')}>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed Amount</option>
          </Select>
          <Input label={percent ? 'Percentage' : 'Fixed Amount'} required type="number" min="0" step={percent ? '1' : '0.01'} prefix={percent ? '%' : '₹'} value={form.value} onChange={(e) => set('value', e.target.value)} error={errors.value} />
          <Input label="Maximum Discount" type="number" min="0" prefix="₹" disabled={!percent} hint={percent ? 'Cap for percentage coupons (optional)' : 'Only for percentage coupons'} value={percent ? form.maxDiscount : ''} onChange={(e) => set('maxDiscount', e.target.value)} error={errors.maxDiscount} />
          <Input label="Minimum Order" type="number" min="0" prefix="₹" value={form.minOrder} onChange={(e) => set('minOrder', e.target.value)} error={errors.minOrder} />
          <Input label="Description" placeholder="Shown to customers" value={form.description} onChange={(e) => set('description', e.target.value)} />
          <Input label="Start Date" type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} error={errors.startsAt} />
          <Input label="Expiry Date" type="datetime-local" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} error={errors.expiresAt} hint="Leave blank for no expiry" />
          <Input label="Usage Limit" type="number" min="1" step="1" placeholder="Unlimited" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} hint="Total redemptions across all customers" />
          <Input label="Per User Limit" type="number" min="1" step="1" placeholder="Unlimited" value={form.perUserLimit} onChange={(e) => set('perUserLimit', e.target.value)} />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Applicable Categories <span className="font-normal text-slate-500">(none selected = all)</span></p>
          <div className="flex flex-wrap gap-2">
            {categories?.map((c) => {
              const on = form.categoryIds.includes(c.id);
              return (
                <button key={c.id} type="button" aria-pressed={on} onClick={() => set('categoryIds', on ? form.categoryIds.filter((x) => x !== c.id) : [...form.categoryIds, c.id])} className={clsx('rounded-full border px-3 py-1 text-xs font-semibold', on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50')}>
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Applicable Products <span className="font-normal text-slate-500">(none selected = all)</span></p>
          {form.products.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {form.products.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-xs font-medium text-slate-700">
                  {p.name}
                  <button type="button" aria-label={`Remove ${p.name}`} onClick={() => set('products', form.products.filter((x) => x.id !== p.id))} className="rounded-full p-0.5 hover:bg-slate-200">×</button>
                </span>
              ))}
            </div>
          )}
          <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products to add…" aria-label="Search products" className="field" />
          {productSearch.trim().length >= 2 && (
            <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200">
              {products.data?.filter((p) => !form.products.some((x) => x.id === p.id)).map((p) => (
                <li key={p.id}><button type="button" onClick={() => { set('products', [...form.products, { id: p.id, name: p.name }]); setProductSearch(''); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">{p.name}</button></li>
              ))}
              {products.data?.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No products found</li>}
            </ul>
          )}
        </div>

        <div className="space-y-2.5 rounded-lg bg-slate-50 p-3">
          <Checkbox label="Active" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
          <Checkbox label="Show on the Offers page and homepage" checked={form.showOnOffers} onChange={(e) => set('showOnOffers', e.target.checked)} />
          {!coupon && <Checkbox label="Notify all customers about this offer" checked={form.notifyCustomers} onChange={(e) => set('notifyCustomers', e.target.checked)} />}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={save.isPending}>{coupon ? 'Save changes' : 'Create coupon'}</Button>
        </div>
      </form>
    </Modal>
  );
}
