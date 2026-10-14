import { errorMessage } from '@/api/client';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Form';
import { adminCategoryService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type AdminSubcategory, type AdminCategory } from '@/types/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function Subcategories({ category }: { category: AdminCategory }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
    void qc.invalidateQueries({ queryKey: ['categories'] });
  };
  const onError = (err: unknown) => toast.error(errorMessage(err));
  const add = useMutation({ mutationFn: () => adminCategoryService.addSubcategory(category.id, name.trim()), onSuccess: () => { setName(''); toast.success('Subcategory added'); refresh(); }, onError });
  const update = useMutation({ mutationFn: (s: AdminSubcategory & { name: string }) => adminCategoryService.updateSubcategory(s.id, { name: s.name, isActive: s.isActive, sortOrder: s.sortOrder }), onSuccess: () => { setEditing(null); refresh(); }, onError });
  const remove = useMutation({ mutationFn: (id: string) => adminCategoryService.removeSubcategory(id), onSuccess: () => { toast.success('Subcategory deleted'); refresh(); }, onError });

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Subcategories</p>
      <ul className="space-y-1.5">
        {category.subcategories.map((s) => (
          <li key={s.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
            {editing?.id === s.id ? (
              <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (editing.name.trim().length >= 2) update.mutate({ ...s, name: editing.name.trim() }); }}>
                <input autoFocus aria-label="Subcategory name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="field h-8 !py-0" />
                <Button type="submit" size="sm" className="h-8" loading={update.isPending}>Save</Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(null)}>Cancel</Button>
              </form>
            ) : (
              <>
                <span className={clsx('flex-1', !s.isActive && 'text-slate-400 line-through')}>{s.name}</span>
                <Toggle label={`${s.name} active`} checked={s.isActive} onChange={(v) => update.mutate({ ...s, isActive: v })} />
                <button onClick={() => setEditing({ id: s.id, name: s.name })} aria-label={`Rename ${s.name}`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove.mutate(s.id)} aria-label={`Delete ${s.name}`} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </>
            )}
          </li>
        ))}
        {category.subcategories.length === 0 && <li className="text-sm text-slate-500">No subcategories yet.</li>}
      </ul>
      <form className="mt-3 flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) add.mutate(); }}>
        <input aria-label="New subcategory name" placeholder="Add a subcategory" value={name} onChange={(e) => setName(e.target.value)} className="field h-9 !py-0" />
        <Button type="submit" size="sm" variant="outline" loading={add.isPending} disabled={name.trim().length < 2} icon={<Plus className="h-4 w-4" />}>Add</Button>
      </form>
    </div>
  );
}
