import type { OrderStatus, PaymentStatus, RefundStatus } from '@/types';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Order placed', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  PROCESSING: { label: 'Processing', tone: 'info' },
  PACKED: { label: 'Packed', tone: 'info' },
  SHIPPED: { label: 'Shipped', tone: 'info' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'info' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  RETURN_REQUESTED: { label: 'Return requested', tone: 'warning' },
  RETURN_APPROVED: { label: 'Return approved', tone: 'info' },
  RETURNED: { label: 'Returned', tone: 'neutral' },
  REFUND_PENDING: { label: 'Refund pending', tone: 'warning' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  REFUND_PENDING: { label: 'Refund pending', tone: 'warning' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
  PARTIALLY_REFUNDED: { label: 'Partially refunded', tone: 'neutral' },
};

export const REFUND_STATUS: Record<RefundStatus, { label: string; tone: Tone }> = {
  REQUESTED: { label: 'Requested', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'info' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  PROCESSING: { label: 'Processing', tone: 'info' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
  cod: 'Cash on Delivery',
  none: 'No payment needed',
};

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];
