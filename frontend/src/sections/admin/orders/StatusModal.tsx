import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { ACTION_LABEL, statusLabel } from '@/sections/admin/orders/labels';
import { adminOrderService } from '@/services/adminService';
import { toast } from '@/store/toast';
import type { OrderStatus } from '@/types';
import { type AdminOrder } from '@/types/admin';
import { money } from '@/utils/format';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function StatusModal({ order, status, onClose }: { order: AdminOrder; status: OrderStatus; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [courier, setCourier] = useState(order.courier ?? '');
  const [tracking, setTracking] = useState(order.trackingNumber ?? '');
  const cancelling = status === 'CANCELLED';
  const update = useMutation({
    mutationFn: () => adminOrderService.updateStatus(order.id, { status, note: note.trim() || undefined, courier: courier.trim() || undefined, trackingNumber: tracking.trim() || undefined }),
    onSuccess: () => {
      toast.success(`Order ${order.orderNumber}: ${statusLabel(status).toLowerCase()}`);
      void qc.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      void qc.invalidateQueries({ queryKey: ['admin', 'order', order.id] });
    },
  });
  return (
    <Modal open onClose={onClose} title={`${ACTION_LABEL[status] ?? statusLabel(status)} — ${order.orderNumber}`} footer={<><Button variant="outline" size="sm" onClick={onClose}>Back</Button><Button size="sm" variant={cancelling ? 'danger' : 'primary'} loading={update.isPending} disabled={cancelling && note.trim().length < 3} onClick={() => update.mutate()}>{cancelling ? 'Cancel order' : (ACTION_LABEL[status] ?? 'Update')}</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {status === 'CONFIRMED' && 'Confirming deducts the reserved stock and makes the invoice available to the customer.'}
          {status === 'SHIPPED' && 'Add the courier details. The customer is notified by email and in their account.'}
          {status === 'DELIVERED' && (order.paymentMethod === 'COD' ? 'This marks the order delivered and the cash as collected.' : 'This marks the order as delivered.')}
          {cancelling && (order.paymentStatus === 'PAID' ? `The customer paid ${money(order.total)}. Cancelling restores the stock and creates a refund for you to process.` : 'Cancelling restores the stock. The customer is notified.')}
          {status === 'RETURNED' && 'Confirm the returned items have arrived. They are added back to stock and the refund becomes ready to process.'}
          {['PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY'].includes(status) && 'The customer will see this update on their order timeline.'}
        </p>
        {status === 'SHIPPED' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Courier" placeholder="e.g. BlueDart" value={courier} onChange={(e) => setCourier(e.target.value)} />
            <Input label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
          </div>
        )}
        <Textarea label={cancelling ? 'Reason for cancellation' : 'Note (optional)'} required={cancelling} rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} hint={cancelling ? 'Shown to the customer' : 'Shown on the order timeline'} />
      </div>
    </Modal>
  );
}
