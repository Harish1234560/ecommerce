import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Checkbox, Select, Textarea } from '@/components/ui/Form';
import { Img } from '@/components/ui/Img';
import { Modal } from '@/components/ui/Modal';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { orderService } from '@/services/orderService';
import { toast } from '@/store/toast';
import type { OrderDetail } from '@/types';
import { money } from '@/utils/format';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const RETURN_REASONS = ['Damaged or defective', 'Wrong item received', 'Not as described', 'Size or fit issue', 'No longer needed', 'Other'];

export function ReturnModal({ order, open, onClose }: { order: OrderDetail; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const returnable = order.items.filter((i) => i.quantity - i.returnedQty > 0);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(returnable.map((i) => [i.id, i.quantity - i.returnedQty])));
  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(returnable.map((i) => [i.id, true])));
  const [reason, setReason] = useState(RETURN_REASONS[0]!);
  const [note, setNote] = useState('');
  const chosen = returnable.filter((i) => picked[i.id]);
  const estimate = chosen.reduce((s, i) => s + Math.round((i.netAmount * (qty[i.id] ?? 1)) / i.quantity), 0);

  const submit = useMutation({
    mutationFn: () => orderService.requestReturn(order.id, { reason: note ? `${reason} — ${note}` : reason, items: chosen.map((i) => ({ orderItemId: i.id, quantity: qty[i.id] ?? 1 })) }),
    onSuccess: () => {
      toast.success('Return request submitted');
      void qc.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <Modal open={open} onClose={onClose} title="Return items" size="lg" footer={<><Button variant="outline" size="sm" onClick={onClose}>Close</Button><Button size="sm" loading={submit.isPending} disabled={chosen.length === 0 || (reason === 'Other' && note.trim().length < 5)} onClick={() => submit.mutate()}>Request return</Button></>}>
      <div className="space-y-4">
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200">
          {returnable.map((i) => (
            <li key={i.id} className="flex items-center gap-3 p-3">
              <Checkbox label={<span className="sr-only">Return {i.name}</span>} checked={!!picked[i.id]} onChange={(e) => setPicked((p) => ({ ...p, [i.id]: e.target.checked }))} />
              <Img src={i.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <span className="min-w-0 flex-1 text-sm"><span className="line-clamp-1 font-medium text-stone-900">{i.name}</span>{i.variantLabel && <span className="text-xs text-stone-500">{i.variantLabel}</span>}</span>
              <QuantityStepper size="sm" value={qty[i.id] ?? 1} max={i.quantity - i.returnedQty} disabled={!picked[i.id]} onChange={(v) => setQty((q) => ({ ...q, [i.id]: v }))} />
            </li>
          ))}
        </ul>
        <Select label="Reason for return" value={reason} onChange={(e) => setReason(e.target.value)}>
          {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
        </Select>
        <Textarea label={reason === 'Other' ? 'Describe the issue' : 'Details (optional)'} required={reason === 'Other'} rows={3} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="rounded-xl bg-stone-100 px-3 py-2.5 text-sm text-stone-700">Estimated refund: <strong>{money(estimate)}</strong>. Once approved we will arrange a pickup; the refund is issued after the item reaches us.</p>
      </div>
    </Modal>
  );
}
