// Transactional email templates. Each returns a subject and an HTML body.
import { env } from '../config/env.js';

export interface EmailContent {
  subject: string;
  html: string;
}

export interface OrderEmailData {
  storeName: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  items: { name: string; quantity: number; lineTotal: number; variantLabel?: string | null }[];
  expectedDelivery?: Date | null;
  trackingNumber?: string | null;
  courier?: string | null;
  reason?: string | null;
  refundAmount?: number;
}

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

function layout(storeName: string, heading: string, body: string, cta?: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1c1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#1c1917;padding:20px 32px;color:#ffffff;font-size:18px;font-weight:700">${esc(storeName)}</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-size:22px">${esc(heading)}</h1>
${body}
${cta ? `<p style="margin:28px 0 0"><a href="${cta.url}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${esc(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:20px 32px;background:#fafaf9;color:#78716c;font-size:12px">You are receiving this email because you have an account or order with ${esc(storeName)}.</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(d: OrderEmailData): string {
  const rows = d.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e7e5e4">${esc(i.name)}${i.variantLabel ? ` <span style="color:#78716c">(${esc(i.variantLabel)})</span>` : ''} × ${i.quantity}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e7e5e4">${inr(i.lineTotal)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-top:16px">${rows}
<tr><td style="padding:12px 0;font-weight:700">Total</td><td align="right" style="padding:12px 0;font-weight:700">${inr(d.total)}</td></tr></table>`;
}

const p = (text: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${text}</p>`;
const orderUrl = (d: OrderEmailData) => `${env.CLIENT_URL}/account/orders/${d.orderId}`;

export const templates = {
  welcome: (d: { storeName: string; name: string }): EmailContent => ({
    subject: `Welcome to ${d.storeName}`,
    html: layout(
      d.storeName,
      `Welcome, ${d.name}!`,
      p('Your account is ready. Browse the store, save favourites to your wishlist and track every order from your account.'),
      { label: 'Start shopping', url: `${env.CLIENT_URL}/products` },
    ),
  }),

  orderConfirmation: (d: OrderEmailData): EmailContent => ({
    subject: `Order ${d.orderNumber} received`,
    html: layout(
      d.storeName,
      'Thank you for your order',
      p(`Hi ${esc(d.customerName)}, we have received your order <strong>${esc(d.orderNumber)}</strong> (${esc(d.paymentMethod)}).`) +
        (d.expectedDelivery ? p(`Expected delivery by <strong>${fmtDate(d.expectedDelivery)}</strong>.`) : '') +
        itemsTable(d),
      { label: 'View order', url: orderUrl(d) },
    ),
  }),

  paymentConfirmation: (d: OrderEmailData): EmailContent => ({
    subject: `Payment received for order ${d.orderNumber}`,
    html: layout(
      d.storeName,
      'Payment successful',
      p(`Hi ${esc(d.customerName)}, we received your payment of <strong>${inr(d.total)}</strong> for order <strong>${esc(d.orderNumber)}</strong>. Your order is confirmed.`) +
        itemsTable(d),
      { label: 'View order', url: orderUrl(d) },
    ),
  }),

  orderShipped: (d: OrderEmailData): EmailContent => ({
    subject: `Order ${d.orderNumber} has shipped`,
    html: layout(
      d.storeName,
      'Your order is on its way',
      p(`Hi ${esc(d.customerName)}, order <strong>${esc(d.orderNumber)}</strong> has been shipped.`) +
        (d.trackingNumber ? p(`Courier: ${esc(d.courier ?? '—')} · Tracking number: <strong>${esc(d.trackingNumber)}</strong>`) : '') +
        (d.expectedDelivery ? p(`Expected delivery by <strong>${fmtDate(d.expectedDelivery)}</strong>.`) : ''),
      { label: 'Track order', url: `${orderUrl(d)}/tracking` },
    ),
  }),

  orderDelivered: (d: OrderEmailData): EmailContent => ({
    subject: `Order ${d.orderNumber} delivered`,
    html: layout(
      d.storeName,
      'Delivered',
      p(`Hi ${esc(d.customerName)}, order <strong>${esc(d.orderNumber)}</strong> has been delivered. We hope you love it.`) +
        p('Tell other shoppers what you think by leaving a review.'),
      { label: 'Write a review', url: `${env.CLIENT_URL}/account/reviews` },
    ),
  }),

  orderCancelled: (d: OrderEmailData): EmailContent => ({
    subject: `Order ${d.orderNumber} cancelled`,
    html: layout(
      d.storeName,
      'Order cancelled',
      p(`Hi ${esc(d.customerName)}, order <strong>${esc(d.orderNumber)}</strong> has been cancelled.`) +
        (d.reason ? p(`Reason: ${esc(d.reason)}`) : '') +
        p('If you already paid, your refund will be initiated shortly and we will email you when it is processed.'),
      { label: 'View order', url: orderUrl(d) },
    ),
  }),

  refundInitiated: (d: OrderEmailData): EmailContent => ({
    subject: `Refund initiated for order ${d.orderNumber}`,
    html: layout(
      d.storeName,
      'Refund initiated',
      p(`Hi ${esc(d.customerName)}, a refund of <strong>${inr(d.refundAmount ?? d.total)}</strong> for order <strong>${esc(d.orderNumber)}</strong> has been initiated.`) +
        p('It usually reaches your original payment method within 5–7 business days. We will confirm once it is completed.'),
      { label: 'View order', url: orderUrl(d) },
    ),
  }),

  refundCompleted: (d: OrderEmailData): EmailContent => ({
    subject: `Refund completed for order ${d.orderNumber}`,
    html: layout(
      d.storeName,
      'Refund completed',
      p(`Hi ${esc(d.customerName)}, your refund of <strong>${inr(d.refundAmount ?? d.total)}</strong> for order <strong>${esc(d.orderNumber)}</strong> has been completed.`),
      { label: 'View order', url: orderUrl(d) },
    ),
  }),

  passwordReset: (d: { storeName: string; name: string; resetUrl: string; minutes: number }): EmailContent => ({
    subject: `Reset your ${d.storeName} password`,
    html: layout(
      d.storeName,
      'Reset your password',
      p(`Hi ${esc(d.name)}, we received a request to reset your password. This link is valid for ${d.minutes} minutes and can be used once.`) +
        p('If you did not request this, you can safely ignore this email.'),
      { label: 'Choose a new password', url: d.resetUrl },
    ),
  }),
};

export type TemplateName = keyof typeof templates;
