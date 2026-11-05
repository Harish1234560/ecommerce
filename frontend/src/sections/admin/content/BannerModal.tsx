import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { fieldErrors, Input, Select, Toggle } from '@/components/ui/Form';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { Modal } from '@/components/ui/Modal';
import { useContentRefresh } from '@/hooks/useContentRefresh';
import { adminContentService } from '@/services/adminService';
import { toast } from '@/store/toast';
import type { Banner } from '@/types';
import { toLocalInput } from '@/utils/date';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

export function BannerModal({ banner, onClose }: { banner: Banner | null; onClose: () => void }) {
  const refresh = useContentRefresh();
  const [form, setForm] = useState({
    type: banner?.type ?? ('HERO' as 'HERO' | 'PROMO'), title: banner?.title ?? '', subtitle: banner?.subtitle ?? '', imageUrl: banner?.imageUrl ?? '', ctaText: banner?.ctaText ?? '', linkUrl: banner?.linkUrl ?? '',
    startsAt: toLocalInput(banner?.startsAt ?? null), endsAt: toLocalInput(banner?.endsAt ?? null), isActive: banner?.isActive ?? true, sortOrder: String(banner?.sortOrder ?? 0),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, sortOrder: Number(form.sortOrder || 0), startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null };
      return banner ? adminContentService.updateBanner(banner.id, body) : adminContentService.createBanner(body);
    },
    onSuccess: () => { toast.success(banner ? 'Banner updated' : 'Banner created'); refresh(); onClose(); },
    onError: (err) => { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.title.trim().length < 2) next.title = 'Title is required';
    if (!form.imageUrl) next.imageUrl = 'Upload an image';
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate();
  };
  return (
    <Modal open onClose={onClose} title={banner ? 'Edit banner' : 'New banner'} size="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Image <span className="text-rose-500">*</span></p>
          <ImageUploader single value={form.imageUrl ? [form.imageUrl] : []} onChange={(u) => setForm({ ...form, imageUrl: u[0] ?? '' })} />
          {errors.imageUrl && <p className="mt-1 text-xs text-rose-600">{errors.imageUrl}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Placement" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'HERO' | 'PROMO' })}>
            <option value="HERO">Hero banner (top carousel)</option>
            <option value="PROMO">Promotional banner</option>
          </Select>
          <Input label="Sort order" type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          <Input label="Title" required wrapperClassName="sm:col-span-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={errors.title} />
          <Input label="Description" wrapperClassName="sm:col-span-2" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <Input label="CTA (button text)" placeholder="Shop Now" value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} />
          <Input label="Link" placeholder="/products?discount=20" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
          <Input label="Start date" type="datetime-local" hint="Optional" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          <Input label="End date" type="datetime-local" hint="Optional" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} error={errors.endsAt} />
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><Toggle label="Enabled" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /> Enabled</label>
        <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={onClose}>Cancel</Button><Button type="submit" size="sm" loading={save.isPending}>{banner ? 'Save changes' : 'Create banner'}</Button></div>
      </form>
    </Modal>
  );
}
