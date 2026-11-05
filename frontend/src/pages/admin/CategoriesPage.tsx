import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { PageHeader } from '@/components/admin/PageHeader';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Badge, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Toggle } from '@/components/ui/Form';
import { Img } from '@/components/ui/Img';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useSeo } from '@/hooks/useSeo';
import { CategoryModal } from '@/sections/admin/categories/CategoryModal';
import { Subcategories } from '@/sections/admin/categories/Subcategories';
import { adminCategoryService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type AdminCategory } from '@/types/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function CategoriesPage() {
  useSeo({ title: 'Categories — Admin', noindex: true });
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useAdminCategories();
  const [editing, setEditing] = useState<AdminCategory | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
    void qc.invalidateQueries({ queryKey: ['categories'] });
    void qc.invalidateQueries({ queryKey: ['home'] });
  };
  const toggle = useMutation({
    mutationFn: (c: AdminCategory) => adminCategoryService.update(c.id, { name: c.name, slug: c.slug, description: c.description, imageUrl: c.imageUrl, bannerUrl: c.bannerUrl, sortOrder: c.sortOrder, isActive: !c.isActive }),
    onSuccess: refresh,
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminCategoryService.remove(id),
    onSuccess: () => { toast.success('Category deleted'); setDeleting(null); refresh(); },
    onError: (err) => { toast.error(errorMessage(err)); setDeleting(null); },
  });

  return (
    <div>
      <PageHeader title="Categories" subtitle="Organise the catalogue into categories and subcategories" actions={<Button size="sm" onClick={() => setEditing(null)} icon={<Plus className="h-4 w-4" />}>New category</Button>} />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {data?.map((c) => (
            <Card key={c.id} padded={false}>
              <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Img src={c.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-slate-900">{c.name}{!c.isActive && <Badge>Inactive</Badge>}</p>
                  <p className="truncate text-sm text-slate-500">/{c.slug} · {c.productCount} product{c.productCount === 1 ? '' : 's'} · {c.subcategories.length} subcategor{c.subcategories.length === 1 ? 'y' : 'ies'}</p>
                </div>
                <Toggle label={`${c.name} active`} checked={c.isActive} disabled={toggle.isPending} onChange={() => toggle.mutate(c)} />
                <div className="flex gap-1">
                  <button onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  <button onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} aria-label="Show subcategories" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronDown className={clsx('h-4 w-4 transition-transform', open === c.id && 'rotate-180')} /></button>
                </div>
              </div>
              {open === c.id && <Subcategories category={c} />}
            </Card>
          ))}
          {data?.length === 0 && <Card><p className="py-8 text-center text-sm text-slate-500">No categories yet. Create your first category.</p></Card>}
        </div>
      )}
      {editing !== undefined && <CategoryModal category={editing} onClose={() => setEditing(undefined)} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending} danger title="Delete category?" confirmLabel="Delete" message={<>“{deleting?.name}” will be removed. Categories that still contain products cannot be deleted — deactivate them instead.</>} />
    </div>
  );
}
