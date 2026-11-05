import { errorMessage } from '@/api/client';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { Textarea } from '@/components/ui/Form';
import { TICKET_LABEL } from '@/sections/admin/support/labels';
import { adminSupportService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type TicketStatus } from '@/types/admin';
import { formatDateTime } from '@/utils/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useState } from 'react';

export function TicketPanel({ id }: { id: string }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'support', 'ticket', id], queryFn: () => adminSupportService.get(id), refetchInterval: 15_000 });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin', 'support'] });
  const send = useMutation({ mutationFn: () => adminSupportService.reply(id, reply.trim()), onSuccess: () => { setReply(''); toast.success('Reply sent'); refresh(); }, onError: (err) => toast.error(errorMessage(err)) });
  const setStatus = useMutation({ mutationFn: (status: TicketStatus) => adminSupportService.setStatus(id, status), onSuccess: () => { toast.success('Ticket status updated'); refresh(); }, onError: (err) => toast.error(errorMessage(err)) });

  if (isLoading) return <PageSpinner />;
  if (error || !data) return <ErrorState error={error} compact />;
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">{data.ticketNumber}</p>
            <h2 className="font-sans text-lg font-semibold text-slate-900">{data.subject}</h2>
            <p className="mt-0.5 text-sm text-slate-600">{data.name} · <a href={`mailto:${data.email}`} className="text-indigo-600 hover:underline">{data.email}</a>{data.phone && ` · +91 ${data.phone}`}</p>
            <p className="text-xs text-slate-500">{data.user ? 'Registered customer' : 'Guest'}{data.order && <> · about order <a href={`/admin/orders/${data.order.id}`} className="font-semibold text-indigo-600 hover:underline">{data.order.orderNumber}</a></>}</p>
          </div>
          <select aria-label="Ticket status" value={data.status} onChange={(e) => setStatus.mutate(e.target.value as TicketStatus)} disabled={setStatus.isPending} className="field h-9 w-auto !py-0 pr-8">
            {(Object.keys(TICKET_LABEL) as TicketStatus[]).map((s) => <option key={s} value={s}>{TICKET_LABEL[s]}</option>)}
          </select>
        </div>
      </div>
      <ul className="flex-1 space-y-3 overflow-y-auto p-5">
        {data.messages.map((m) => (
          <li key={m.id} className={clsx('max-w-[85%] rounded-2xl px-4 py-3 text-sm', m.fromAdmin ? 'ml-auto bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800')}>
            <p className="whitespace-pre-wrap">{m.message}</p>
            <p className={clsx('mt-1 text-[11px]', m.fromAdmin ? 'text-indigo-200' : 'text-slate-500')}>{m.senderName}{m.fromAdmin && ' (you/admin)'} · {formatDateTime(m.createdAt)}</p>
          </li>
        ))}
      </ul>
      <form className="border-t border-slate-100 p-4" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) send.mutate(); }}>
        <Textarea aria-label="Reply" rows={3} placeholder={data.user ? 'Write a reply — the customer sees it in their account…' : 'Write a reply (this guest has no account — also email them)…'} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={3000} />
        <div className="mt-2 flex justify-end"><Button type="submit" size="sm" loading={send.isPending} disabled={!reply.trim()} icon={<Send className="h-4 w-4" />}>Send reply</Button></div>
      </form>
    </div>
  );
}
