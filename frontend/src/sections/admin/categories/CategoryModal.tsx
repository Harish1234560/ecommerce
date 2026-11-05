import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { fieldErrors, Input, Textarea, Toggle } from '@/components/ui/Form';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { Modal } from '@/components/ui/Modal';
import { adminCategoryService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type AdminCategory } from '@/types/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

export function CategoryModal({ category, onClose }: { category: AdminCategory | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: category?.name ?? '', description: category?.description ?? '', imageUrl: category?.imageUrl ?? '', bannerUrl: category?.bannerUrl ?? '',
    isActive: category?.isActive ?? true, sortOrder: String(category?.sortOrder ?? 0),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, sortOrder: Number(form.sortOrder || 0), slug: category?.slug };
      return category ? adminCategoryService.update(category.id, body) : adminCategoryService.create(body);
    },
    onSuccess: () => {
      toast.success(category ? 'Category updated' : 'Category created');
      void qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      void qc.invalidateQueries({ queryKey: ['categories'] });
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
    if (form.name.trim().length < 2) return setErrors({ name: 'Category name is required' });
    save.mutate();
  };
  return (
    <Modal open onClose={onClose} title={category ? 'Edit category' : 'New category'} size="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <Input label="Sort order" type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </div>
        <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Category image</p>
            <ImageUploader single value={form.imageUrl ? [form.imageUrl] : []} onChange={(u) => setForm({ ...form, imageUrl: u[0] ?? '' })} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Banner (category page)</p>
            <ImageUploader single value={form.bannerUrl ? [form.bannerUrl] : []} onChange={(u) => setForm({ ...form, bannerUrl: u[0] ?? '' })} />
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <Toggle label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} /> Active — visible in the store
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={save.isPending}>{category ? 'Save changes' : 'Create category'}</Button>
        </div>
      </form>
    </Modal>
  );
}
