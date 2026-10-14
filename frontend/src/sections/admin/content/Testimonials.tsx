import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Toggle } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Stars } from '@/components/ui/Rating';
import { useContentRefresh } from '@/hooks/useContentRefresh';
import { adminContentService } from '@/services/adminService';
import { toast } from '@/store/toast';
import type { Testimonial } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function Testimonials({ items }: { items: Testimonial[] }) {
  const refresh = useContentRefresh();
  const blank = { id: '', name: '', location: '', text: '', rating: 5, isActive: true, sortOrder: items.length + 1 };
  const [editing, setEditing] = useState<typeof blank | null>(null);
  const [deleting, setDeleting] = useState<Testimonial | null>(null);
  const save = useMutation({
    mutationFn: (t: typeof blank) => (t.id ? adminContentService.updateTestimonial(t.id, t) : adminContentService.createTestimonial(t)),
    onSuccess: () => { toast.success('Testimonial saved'); setEditing(null); refresh(); },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({ mutationFn: (id: string) => adminContentService.removeTestimonial(id), onSuccess: () => { toast.success('Testimonial deleted'); setDeleting(null); refresh(); }, onError: (err) => toast.error(errorMessage(err)) });
  return (
    <Card title="Testimonials" subtitle="Customer quotes shown on the homepage" actions={<Button size="sm" className="h-8" onClick={() => setEditing(blank)} icon={<Plus className="h-3.5 w-3.5" />}>Add testimonial</Button>}>
      {items.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No testimonials yet.</p> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((t) => (
            <li key={t.id} className={clsx('rounded-lg border border-slate-200 p-4', !t.isActive && 'opacity-60')}>
              <Stars value={t.rating} />
              <p className="mt-2 line-clamp-3 text-sm text-slate-700">{t.text}</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{t.name}<span className="ml-1 font-normal text-slate-500">{t.location}</span></p>
                <div className="flex items-center gap-1">
                  <Toggle label={`${t.name} visible`} checked={t.isActive} onChange={(v) => save.mutate({ ...t, location: t.location ?? '', isActive: v })} />
                  <button onClick={() => setEditing({ ...t, location: t.location ?? '' })} aria-label="Edit testimonial" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleting(t)} aria-label="Delete testimonial" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? 'Edit testimonial' : 'New testimonial'} footer={<><Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" loading={save.isPending} disabled={editing.name.trim().length < 2 || editing.text.trim().length < 10} onClick={() => save.mutate(editing)}>Save</Button></>}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Customer name" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Input label="Location" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
            </div>
            <Textarea label="Quote" required rows={4} maxLength={600} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
            <Select label="Rating" value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star{r > 1 ? 's' : ''}</option>)}
            </Select>
          </div>
        </Modal>
      )}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending} danger title="Delete testimonial?" confirmLabel="Delete" message={`The quote from ${deleting?.name} will be removed.`} />
    </Card>
  );
}
