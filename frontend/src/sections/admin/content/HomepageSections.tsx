import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input, Toggle } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useContentRefresh } from '@/hooks/useContentRefresh';
import { adminContentService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type HomepageSection } from '@/types/admin';
import { useMutation } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil } from 'lucide-react';
import { useState } from 'react';

const SECTION_HINT: Record<string, string> = {
  categories: 'Category tiles', featured: 'Products flagged as featured', trending: 'Products flagged as trending', bestsellers: 'Best-selling products',
  offers: 'Active coupons', promo: 'Promotional banners', testimonials: 'Customer testimonials', newsletter: 'Newsletter sign-up',
};

export function HomepageSections({ sections }: { sections: HomepageSection[] }) {
  const refresh = useContentRefresh();
  const [editing, setEditing] = useState<HomepageSection | null>(null);
  const save = useMutation({
    mutationFn: (s: HomepageSection) => adminContentService.updateSection(s.id, { title: s.title, subtitle: s.subtitle, isActive: s.isActive, sortOrder: s.sortOrder }),
    onSuccess: () => { refresh(); setEditing(null); },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
  // Swap sort positions with the neighbour.
  const move = async (index: number, dir: -1 | 1) => {
    const a = ordered[index];
    const b = ordered[index + dir];
    if (!a || !b) return;
    try {
      await Promise.all([
        adminContentService.updateSection(a.id, { title: a.title, subtitle: a.subtitle, isActive: a.isActive, sortOrder: b.sortOrder }),
        adminContentService.updateSection(b.id, { title: b.title, subtitle: b.subtitle, isActive: b.isActive, sortOrder: a.sortOrder }),
      ]);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  return (
    <Card title="Homepage sections" subtitle="Choose which sections appear on the homepage, their titles and order" padded={false}>
      <ul className="divide-y divide-slate-100">
        {ordered.map((s, i) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="flex flex-col">
              <button disabled={i === 0} onClick={() => void move(i, -1)} aria-label={`Move ${s.title} up`} className="rounded p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
              <button disabled={i === ordered.length - 1} onClick={() => void move(i, 1)} aria-label={`Move ${s.title} down`} className="rounded p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
            </div>
            <div className="min-w-0 flex-1">
              <p className={clsx('text-sm font-semibold', s.isActive ? 'text-slate-900' : 'text-slate-400')}>{s.title}</p>
              <p className="truncate text-xs text-slate-500">{SECTION_HINT[s.key] ?? s.key}{s.subtitle && ` · “${s.subtitle}”`}</p>
            </div>
            <Toggle label={`${s.title} visible`} checked={s.isActive} disabled={save.isPending} onChange={(v) => save.mutate({ ...s, isActive: v })} />
            <button onClick={() => setEditing(s)} aria-label={`Edit ${s.title}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal open onClose={() => setEditing(null)} title="Edit section" size="sm" footer={<><Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" loading={save.isPending} disabled={!editing.title.trim()} onClick={() => save.mutate(editing)}>Save</Button></>}>
          <div className="space-y-4">
            <Input label="Title" required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <Input label="Subtitle" value={editing.subtitle ?? ''} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
          </div>
        </Modal>
      )}
    </Card>
  );
}
