import { Badge } from '@/components/ui/Feedback';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/constants';
import type { OrderStatus, PaymentStatus } from '@/types';

export function OrderBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_STATUS[status].tone}>{status === 'PENDING' ? 'Pending' : ORDER_STATUS[status].label}</Badge>;
}

export function PayBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_STATUS[status].tone}>{status === 'PAID' ? 'Successful' : PAYMENT_STATUS[status].label}</Badge>;
}
