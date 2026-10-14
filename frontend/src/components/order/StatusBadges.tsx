import { Badge } from '@/components/ui/Feedback';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/constants';
import type { OrderStatus, PaymentStatus } from '@/types';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function PaymentStatusBadge({ status, cancelledCod }: { status: PaymentStatus; cancelledCod?: boolean }) {
  if (cancelledCod) return <Badge>Not charged</Badge>;
  const s = PAYMENT_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
