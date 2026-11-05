import { PAYMENT_METHOD_LABEL } from '@/constants';
import type { OrderStatus } from '@/types';

export const cancelledUnpaidCod = (o: { status: OrderStatus; paymentMethod: string; paymentStatus: string }) => o.status === 'CANCELLED' && o.paymentMethod === 'COD' && o.paymentStatus === 'PENDING';

export const methodLabel = (method: string | null, gateway?: string) => PAYMENT_METHOD_LABEL[method ?? ''] ?? (gateway === 'COD' ? 'Cash on Delivery' : (method ?? 'Online'));
