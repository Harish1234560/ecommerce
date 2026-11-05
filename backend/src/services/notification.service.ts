import type { NotificationType } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { templates, type OrderEmailData } from '../emails/templates.js';
import { sendEmail } from './email.service.js';
import { getSettings } from './settings.service.js';
import { logger } from '../utils/logger.js';

// Notification pipeline. Every event creates an in-app notification and fans out to the
// registered channels. Email is implemented; SMS / WhatsApp / push can be added by
// registering another channel here without touching the callers.

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

type Channel = (payload: NotificationPayload) => Promise<void>;

const inAppChannel: Channel = async (p) => {
  await prisma.notification.create({ data: p });
};

const channels: Channel[] = [inAppChannel];

export function registerChannel(channel: Channel) {
  channels.push(channel);
}

export async function notify(payload: NotificationPayload) {
  await Promise.all(channels.map((c) => c(payload).catch((err) => logger.error('Notification channel failed', err))));
}

export type OrderEvent =
  | 'ORDER_CREATED'
  | 'PAYMENT_SUCCESSFUL'
  | 'ORDER_CONFIRMED'
  | 'ORDER_PACKED'
  | 'ORDER_SHIPPED'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'REFUND_INITIATED'
  | 'REFUND_COMPLETED'
  | 'REFUND_FAILED';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Loads the order fresh and notifies the customer in-app and by email. Never throws.
export async function notifyOrderEvent(orderId: string, event: OrderEvent, extra: { reason?: string; refundAmount?: number } = {}) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, user: true } });
    if (!order) return;
    const settings = await getSettings();
    const num = order.orderNumber ?? order.id;
    const link = `/account/orders/${order.id}`;
    const data: OrderEmailData = {
      storeName: settings.store.name,
      customerName: order.user.name,
      orderId: order.id,
      orderNumber: num,
      total: order.total,
      paymentMethod: order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid online',
      items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, lineTotal: i.lineTotal, variantLabel: i.variantLabel })),
      expectedDelivery: order.expectedDelivery,
      trackingNumber: order.trackingNumber,
      courier: order.courier,
      reason: extra.reason ?? order.cancelReason,
      refundAmount: extra.refundAmount,
    };
    const refund = extra.refundAmount !== undefined ? inr(extra.refundAmount) : '';
    const to = order.user.email;

    const send = (type: NotificationType, title: string, message: string, to_link = link) =>
      notify({ userId: order.userId, type, title, message, link: to_link });

    switch (event) {
      case 'ORDER_CREATED':
        await send('ORDER', 'Order placed', `Your order ${num} for ${inr(order.total)} has been placed.`);
        await sendEmail(to, 'orderConfirmation', templates.orderConfirmation(data));
        break;
      case 'PAYMENT_SUCCESSFUL':
        await send('PAYMENT', 'Payment successful', `We received ${inr(order.total)} for order ${num}. Your order is confirmed.`);
        await sendEmail(to, 'paymentConfirmation', templates.paymentConfirmation(data));
        break;
      case 'ORDER_CONFIRMED':
        await send('ORDER', 'Order confirmed', `Order ${num} has been confirmed and will be packed soon.`);
        break;
      case 'ORDER_PACKED':
        await send('ORDER', 'Order packed', `Order ${num} is packed and ready to ship.`);
        break;
      case 'ORDER_SHIPPED':
        await send('ORDER', 'Order shipped', `Order ${num} is on its way.`, `${link}/tracking`);
        await sendEmail(to, 'orderShipped', templates.orderShipped(data));
        break;
      case 'ORDER_OUT_FOR_DELIVERY':
        await send('ORDER', 'Out for delivery', `Order ${num} is out for delivery today.`, `${link}/tracking`);
        break;
      case 'ORDER_DELIVERED':
        await send('ORDER', 'Order delivered', `Order ${num} has been delivered. Enjoy!`);
        await sendEmail(to, 'orderDelivered', templates.orderDelivered(data));
        break;
      case 'ORDER_CANCELLED':
        await send('ORDER', 'Order cancelled', `Order ${num} has been cancelled.${data.reason ? ` Reason: ${data.reason}` : ''}`);
        await sendEmail(to, 'orderCancelled', templates.orderCancelled(data));
        break;
      case 'RETURN_REQUESTED':
        await send('REFUND', 'Return requested', `We received your return request for order ${num}. We will review it shortly.`);
        break;
      case 'RETURN_APPROVED':
        await send('REFUND', 'Return approved', `Your return for order ${num} is approved. Please keep the items ready for pickup.`);
        break;
      case 'RETURN_REJECTED':
        await send('REFUND', 'Return request declined', `Your return request for order ${num} was declined.${extra.reason ? ` Reason: ${extra.reason}` : ''}`);
        break;
      case 'REFUND_INITIATED':
        await send('REFUND', 'Refund initiated', `A refund of ${refund} for order ${num} has been initiated.`);
        await sendEmail(to, 'refundInitiated', templates.refundInitiated(data));
        break;
      case 'REFUND_COMPLETED':
        await send('REFUND', 'Refund completed', `Your refund of ${refund} for order ${num} has been completed.`);
        await sendEmail(to, 'refundCompleted', templates.refundCompleted(data));
        break;
      case 'REFUND_FAILED':
        await send('REFUND', 'Refund delayed', `The refund for order ${num} could not be processed yet. Our team is on it.`);
        break;
    }
  } catch (err) {
    logger.error('Could not send order notification', err, { event, orderId });
  }
}

// Broadcast (e.g. a new offer) to every active customer.
export async function notifyAllCustomers(type: NotificationType, title: string, message: string, link?: string) {
  const users = await prisma.user.findMany({ where: { role: 'CUSTOMER', isActive: true }, select: { id: true } });
  if (users.length === 0) return 0;
  await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, type, title, message, link })) });
  return users.length;
}

// ───────────────────────── Customer inbox ─────────────────────────

export async function listNotifications(userId: string, q: { page: number; limit: number; unreadOnly: boolean }) {
  const where = { userId, ...(q.unreadOnly ? { isRead: false } : {}) };
  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { items, total, unreadCount };
}

export function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export async function deleteNotification(userId: string, id: string): Promise<void> {
  await prisma.notification.deleteMany({ where: { id, userId } });
}
