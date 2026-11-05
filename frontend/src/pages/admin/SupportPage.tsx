import { Card } from '@/components/admin/Card';
import { SearchInput, Tabs } from '@/components/admin/Filters';
import { PageHeader } from '@/components/admin/PageHeader';
import { clsx } from '@/components/ui';
import { Badge, ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { useSeo } from '@/hooks/useSeo';
import { ADMIN_TICKET_TONE, TICKET_LABEL } from '@/sections/admin/support/labels';
import { TicketPanel } from '@/sections/admin/support/TicketPanel';
import { adminSupportService } from '@/services/adminService';
import { type TicketStatus } from '@/types/admin';
import { timeAgo } from '@/utils/format';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function SupportPage() {
  useSeo({ title: 'Support — Admin', noindex: true });
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'support', 'list', status, q, page],
    queryFn: () => adminSupportService.list({ status, q, page, limit: 12 }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const counts = data?.meta.statusCounts ?? {};

  return (
    <div>
      <PageHeader title="Support" subtitle="Customer support tickets from the contact form" />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onChange={(s) => { setStatus(s); setPage(1); }} tabs={[{ value: '' as const, label: 'All' }, ...(Object.keys(TICKET_LABEL) as TicketStatus[]).map((s) => ({ value: s, label: TICKET_LABEL[s], count: counts[s] ?? 0 }))]} />
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search subject, name or email" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card padded={false} className={clsx(active && 'hidden lg:block')}>
          {error ? <ErrorState error={error} onRetry={() => void refetch()} compact /> : isLoading ? <PageSpinner /> : data?.data.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-slate-500">No tickets here</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data?.data.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setActive(t.id)} className={clsx('block w-full px-4 py-3.5 text-left transition-colors hover:bg-slate-50', active === t.id && 'bg-indigo-50')}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{t.subject}</span>
                      <Badge tone={ADMIN_TICKET_TONE[t.status]}>{TICKET_LABEL[t.status]}</Badge>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{t.ticketNumber} · {t.name} · {timeAgo(t.updatedAt)}</span>
                    {t.lastMessage && <span className="mt-1 block truncate text-sm text-slate-600">{t.lastMessage.fromAdmin && <span className="text-slate-400">You: </span>}{t.lastMessage.message}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {data && data.meta.pages > 1 && <div className="border-t border-slate-100 p-3"><Pagination page={page} pages={data.meta.pages} onChange={setPage} /></div>}
        </Card>
        <Card padded={false} className={clsx('min-h-[28rem]', !active && 'hidden lg:block')}>
          {active ? (
            <>
              <button onClick={() => setActive(null)} className="border-b border-slate-100 px-5 py-2.5 text-sm font-semibold text-indigo-600 lg:hidden">← All tickets</button>
              <TicketPanel key={active} id={active} />
            </>
          ) : (
            <p className="flex h-full min-h-[28rem] items-center justify-center text-sm text-slate-500">Select a ticket to read and reply</p>
          )}
        </Card>
      </div>
    </div>
  );
}
