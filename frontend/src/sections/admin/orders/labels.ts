import { ORDER_STATUS } from '@/constants';
import type { OrderStatus } from '@/types';

export const ORDER_TABS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUND_PENDING', 'REFUNDED'];

export const statusLabel = (s: OrderStatus) => (s === 'PENDING' ? 'Pending' : ORDER_STATUS[s].label);

export const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Confirm',
  PROCESSING: 'Start processing',
  PACKED: 'Pack',
  SHIPPED: 'Ship',
  OUT_FOR_DELIVERY: 'Mark Out for Delivery',
  DELIVERED: 'Mark Delivered',
  CANCELLED: 'Cancel',
  RETURNED: 'Mark return received',
};
