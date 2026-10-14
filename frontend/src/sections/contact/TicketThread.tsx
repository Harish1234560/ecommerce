import { errorMessage } from '@/api/client';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import { supportService } from '@/services/accountService';
import { toast } from '@/store/toast';
import { formatDateTime } from '@/utils/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useState } from 'react';

export const TICKET_TONE = { OPEN: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success', CLOSED: 'neutral' } as const;

export function TicketThread({ id }: { id: string }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['tickets', id], queryFn: () => supportService.ticket(id), refetchInterval: 20_000 });
  const reply = useMutation({
    mutationFn: () => supportService.reply(id, message.trim()),
    onSuccess: () => {
      setMessage('');
      void qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (error || !data) return <p className="text-sm text-rose-600">{errorMessage(error)}</p>;
  return (
    <div className="mt-3 border-t border-stone-200 pt-3">
      <ul className="max-h-72 space-y-2.5 overflow-y-auto">
        {data.messages?.map((m) => (
          <li key={m.id} className={clsx('max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm', m.fromAdmin ? 'bg-stone-100 text-stone-800' : 'ml-auto bg-brand-600 text-white')}>
            <p className="whitespace-pre-wrap">{m.message}</p>
            <p className={clsx('mt-1 text-[11px]', m.fromAdmin ? 'text-stone-500' : 'text-brand-100')}>{m.fromAdmin ? `${m.senderName} · Support` : 'You'} · {formatDateTime(m.createdAt)}</p>
          </li>
        ))}
      </ul>
      {data.status !== 'CLOSED' ? (
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (message.trim()) reply.mutate(); }}>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a reply…" aria-label="Reply" className="field !py-2" maxLength={3000} />
          <Button type="submit" size="sm" className="h-auto" loading={reply.isPending} disabled={!message.trim()} aria-label="Send reply"><Send className="h-4 w-4" /></Button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-stone-500">This ticket is closed. Send a new message above if you still need help.</p>
      )}
    </div>
  );
}
