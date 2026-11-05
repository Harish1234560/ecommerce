import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Feedback';
import { Toggle } from '@/components/ui/Form';
import { Img } from '@/components/ui/Img';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useContentRefresh } from '@/hooks/useContentRefresh';
import { BannerModal } from '@/sections/admin/content/BannerModal';
import { adminContentService } from '@/services/adminService';
import { toast } from '@/store/toast';
import type { Banner } from '@/types';
import { formatDate } from '@/utils/format';
import { useMutation } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function Banners({ banners }: { banners: Banner[] }) {
  const refresh = useContentRefresh();
  const [editing, setEditing] = useState<Banner | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const toggle = useMutation({ mutationFn: (b: Banner) => adminContentService.updateBanner(b.id, { ...b, isActive: !b.isActive }), onSuccess: refresh, onError: (err) => toast.error(errorMessage(err)) });
  const remove = useMutation({ mutationFn: (id: string) => adminContentService.removeBanner(id), onSuccess: () => { toast.success('Banner deleted'); setDeleting(null); refresh(); }, onError: (err) => toast.error(errorMessage(err)) });
  const now = Date.now();
  return (
    <Card title="Banners" subtitle="Hero carousel and promotional banners on the homepage" actions={<Button size="sm" className="h-8" onClick={() => setEditing(null)} icon={<Plus className="h-3.5 w-3.5" />}>Add banner</Button>}>
      {banners.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No banners yet.</p> : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {banners.map((b) => {
            const scheduled = b.startsAt && new Date(b.startsAt).getTime() > now;
            const ended = b.endsAt && new Date(b.endsAt).getTime() < now;
            return (
              <li key={b.id} className="overflow-hidden rounded-lg border border-slate-200">
                <div className="relative h-32 bg-slate-900">
                  <Img src={b.imageUrl} alt="" className="h-full w-full object-cover opacity-80" />
                  <div className="absolute left-2 top-2 flex gap-1.5"><Badge tone="info">{b.type === 'HERO' ? 'Hero' : 'Promo'}</Badge>{ended ? <Badge tone="danger">Ended</Badge> : scheduled ? <Badge tone="warning">Scheduled</Badge> : !b.isActive ? <Badge>Disabled</Badge> : <Badge tone="success">Live</Badge>}</div>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{b.title}</p>
                  <p className="truncate text-xs text-slate-500">{b.subtitle || '—'}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{b.ctaText ? `${b.ctaText} → ${b.linkUrl ?? ''}` : 'No button'}{(b.startsAt || b.endsAt) && ` · ${b.startsAt ? formatDate(b.startsAt) : 'now'} – ${b.endsAt ? formatDate(b.endsAt) : 'open'}`}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Toggle label={`${b.title} enabled`} checked={b.isActive} disabled={toggle.isPending} onChange={() => toggle.mutate(b)} />
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(b)} aria-label={`Edit ${b.title}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleting(b)} aria-label={`Delete ${b.title}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing !== undefined && <BannerModal banner={editing} onClose={() => setEditing(undefined)} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending} danger title="Delete banner?" confirmLabel="Delete" message={`“${deleting?.title}” will be removed from the homepage.`} />
    </Card>
  );
}
