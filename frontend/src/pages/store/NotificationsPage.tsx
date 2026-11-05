import { errorMessage } from '@/api/client';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { useSeo } from '@/hooks/useSeo';
import { notificationService } from '@/services/accountService';
import { toast } from '@/store/toast';
import type { Notification } from '@/types';
import { timeAgo } from '@/utils/format';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCheck, CreditCard, Headphones, Package, RotateCcw, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NOTE_ICON = { ORDER: Package, PAYMENT: CreditCard, REFUND: RotateCcw, OFFER: Tag, SUPPORT: Headphones, SYSTEM: Bell } as const;

export function NotificationsPage() {
  useSeo({ title: 'Notifications', noindex: true });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', 'list', page, unreadOnly],
    queryFn: () => notificationService.list({ page, limit: 15, unread: unreadOnly ? 'true' : undefined }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: (id: string) => notificationService.markRead(id), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => notificationService.markAllRead(), onSuccess: () => { toast.success('All notifications marked as read'); refresh(); }, onError: (e) => toast.error(errorMessage(e)) });
  const remove = useMutation({ mutationFn: (id: string) => notificationService.remove(id), onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });

  const open = (n: Notification) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };
  const unread = data?.meta.unreadCount ?? 0;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Notifications {unread > 0 && <Badge tone="success" className="ml-1 align-middle">{unread} unread</Badge>}</h1>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-stone-300 bg-white text-sm font-medium" role="group">
            <button className={clsx('px-3 py-1.5', !unreadOnly ? 'bg-ink text-white' : 'text-stone-600 hover:bg-stone-100')} aria-pressed={!unreadOnly} onClick={() => { setUnreadOnly(false); setPage(1); }}>All</button>
            <button className={clsx('px-3 py-1.5', unreadOnly ? 'bg-ink text-white' : 'text-stone-600 hover:bg-stone-100')} aria-pressed={unreadOnly} onClick={() => { setUnreadOnly(true); setPage(1); }}>Unread</button>
          </div>
          <Button size="sm" variant="outline" disabled={unread === 0} loading={markAll.isPending} onClick={() => markAll.mutate()} icon={<CheckCheck className="h-4 w-4" />}>Mark all as read</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data || data.data.length === 0 ? (
        <div className="card"><EmptyState icon={<BellOff />} title={unreadOnly ? 'You are all caught up' : 'No notifications yet'} message="Order updates, offers and refund updates will appear here." /></div>
      ) : (
        <>
          <ul className="card divide-y divide-stone-200 overflow-hidden">
            {data.data.map((n) => {
              const Icon = NOTE_ICON[n.type] ?? Bell;
              return (
                <li key={n.id} className={clsx('flex items-start gap-3 p-4 transition-colors', !n.isRead && 'bg-brand-50/60')}>
                  <span className={clsx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', n.isRead ? 'bg-stone-100 text-stone-500' : 'bg-brand-100 text-brand-700')}><Icon className="h-4 w-4" /></span>
                  <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-2">
                      <span className={clsx('text-sm text-stone-900', n.isRead ? 'font-medium' : 'font-bold')}>{n.title}</span>
                      {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                    </span>
                    <span className="mt-0.5 block text-sm text-stone-600">{n.message}</span>
                    <span className="mt-1 block text-xs text-stone-400">{timeAgo(n.createdAt)}</span>
                  </button>
                  <div className="flex shrink-0 items-center">
                    {!n.isRead && <button onClick={() => markRead.mutate(n.id)} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">Mark read</button>}
                    <button onClick={() => remove.mutate(n.id)} aria-label="Delete notification" className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-6"><Pagination page={page} pages={data.meta.pages} onChange={setPage} /></div>
        </>
      )}
    </div>
  );
}
