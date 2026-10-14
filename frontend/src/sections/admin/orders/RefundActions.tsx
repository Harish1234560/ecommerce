import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { adminRefundService } from '@/services/adminService';
import { toast } from '@/store/toast';
import type { OrderStatus } from '@/types';
import { type AdminRefund } from '@/types/admin';
import { money } from '@/utils/format';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PackageCheck } from 'lucide-react';
import { useState } from 'react';

export function RefundActions({ refund, orderStatus, viaGateway }: { refund: AdminRefund; orderStatus: OrderStatus; viaGateway: boolean }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<'reject' | 'process' | null>(null);
  const [text, setText] = useState('');
  const done = (msg: string) => {
    toast.success(msg);
    setDialog(null);
    setText('');
    void qc.invalidateQueries({ queryKey: ['admin'] });
  };
  const onError = (err: unknown) => {
    toast.error(errorMessage(err));
    void qc.invalidateQueries({ queryKey: ['admin'] });
  };
  const approve = useMutation({ mutationFn: () => adminRefundService.approve(refund.id), onSuccess: () => done('Return approved'), onError });
  const reject = useMutation({ mutationFn: () => adminRefundService.reject(refund.id, text.trim()), onSuccess: () => done('Return request rejected'), onError });
  const received = useMutation({ mutationFn: () => adminRefundService.markReceived(refund.id), onSuccess: () => done('Items received and restocked'), onError });
  const process = useMutation({
    mutationFn: () => adminRefundService.process(refund.id, text.trim() || undefined),
    onSuccess: (r) => done(r.status === 'COMPLETED' ? 'Refund completed' : 'Refund sent to the payment gateway — awaiting confirmation'),
    onError,
  });

  const canProcess = ['APPROVED', 'FAILED'].includes(refund.status) && orderStatus === 'REFUND_PENDING';
  const awaitingItems = refund.type === 'RETURN' && refund.status === 'APPROVED' && orderStatus === 'RETURN_APPROVED';
  return (
    <div className="flex flex-wrap gap-2">
      {refund.status === 'REQUESTED' && (
        <>
          <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate()}>Approve Return</Button>
          <Button size="sm" variant="outline" className="text-rose-600" onClick={() => setDialog('reject')}>Reject</Button>
        </>
      )}
      {awaitingItems && <Button size="sm" loading={received.isPending} onClick={() => received.mutate()} icon={<PackageCheck className="h-4 w-4" />}>Mark items received</Button>}
      {canProcess && (
        <Button size="sm" loading={process.isPending} onClick={() => (viaGateway ? process.mutate() : setDialog('process'))}>
          {refund.status === 'FAILED' ? 'Retry refund' : viaGateway ? 'Process Refund' : 'Record manual refund'}
        </Button>
      )}
      {refund.status === 'PROCESSING' && <span className="text-xs text-slate-500">Sent to the gateway — this completes automatically when the gateway confirms it.</span>}

      <Modal open={dialog === 'reject'} onClose={() => setDialog(null)} title="Reject return request" size="sm" footer={<><Button variant="outline" size="sm" onClick={() => setDialog(null)}>Back</Button><Button variant="danger" size="sm" disabled={text.trim().length < 3} loading={reject.isPending} onClick={() => reject.mutate()}>Reject request</Button></>}>
        <Textarea label="Reason" required rows={3} value={text} onChange={(e) => setText(e.target.value)} hint="The customer will see this reason" maxLength={300} />
      </Modal>
      <Modal open={dialog === 'process'} onClose={() => setDialog(null)} title="Record manual refund" size="sm" footer={<><Button variant="outline" size="sm" onClick={() => setDialog(null)}>Back</Button><Button size="sm" disabled={text.trim().length < 3} loading={process.isPending} onClick={() => process.mutate()}>Mark as refunded</Button></>}>
        <p className="mb-3 text-sm text-slate-600">This order was not paid through the payment gateway, so send {money(refund.amount)} by bank transfer or UPI first, then record the transaction reference here.</p>
        <Input label="Transaction reference" required value={text} onChange={(e) => setText(e.target.value)} placeholder="UPI / bank reference number" />
      </Modal>
    </div>
  );
}
