import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { orderService } from '@/services/orderService';
import { toast } from '@/store/toast';
import type { OrderDetail } from '@/types';
import { money } from '@/utils/format';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const CANCEL_REASONS = ['Ordered by mistake', 'Found a better price', 'Delivery is taking too long', 'Want to change address or items', 'Other'];

export function CancelModal({ order, open, onClose }: { order: OrderDetail; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState(CANCEL_REASONS[0]!);
  const [note, setNote] = useState('');
  const cancel = useMutation({
    mutationFn: () => orderService.cancel(order.id, reason === 'Other' ? note : note ? `${reason} — ${note}` : reason),
    onSuccess: () => {
      toast.success('Order cancelled');
      void qc.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      void qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
  return (
    <Modal open={open} onClose={onClose} title={`Cancel order ${order.orderNumber}`} footer={<><Button variant="outline" size="sm" onClick={onClose}>Keep order</Button><Button variant="danger" size="sm" loading={cancel.isPending} disabled={reason === 'Other' && note.trim().length < 3} onClick={() => cancel.mutate()}>Cancel order</Button></>}>
      <div className="space-y-4">
        <Select label="Why are you cancelling?" value={reason} onChange={(e) => setReason(e.target.value)}>
          {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
        </Select>
        <Textarea label={reason === 'Other' ? 'Tell us more' : 'Anything else? (optional)'} required={reason === 'Other'} rows={3} maxLength={250} value={note} onChange={(e) => setNote(e.target.value)} />
        {order.paymentStatus === 'PAID' && <p className="rounded-xl bg-stone-100 px-3 py-2.5 text-sm text-stone-700">You paid {money(order.total)}. It will be refunded to your original payment method after cancellation.</p>}
      </div>
    </Modal>
  );
}
