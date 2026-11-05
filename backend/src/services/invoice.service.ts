import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import type { Order, OrderItem, User } from '@prisma/client';
import { getSettings } from './settings.service.js';

type InvoiceOrder = Order & { items: OrderItem[]; user: Pick<User, 'name' | 'email' | 'phone'> };

// The built-in PDF fonts have no ₹ glyph, so amounts are written as "Rs.".
const money = (paise: number) => `Rs. ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export async function streamInvoice(order: InvoiceOrder, res: Response) {
  const { store } = await getSettings();
  const addr = order.shippingAddress as Record<string, string | null>;
  const doc = new PDFDocument({ size: 'A4', margin: 48 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`);
  doc.pipe(res);

  const left = 48;
  const right = 547;
  const width = right - left;

  // Header
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#1c1917').text(store.name, left, 48);
  doc.font('Helvetica').fontSize(9).fillColor('#57534e');
  doc.text(store.address, left, 74, { width: 260 });
  doc.text(`${store.phone}  ·  ${store.email}`, { width: 260 });
  if (store.gstin) doc.text(`GSTIN: ${store.gstin}`, { width: 260 });

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#1c1917').text('TAX INVOICE', left, 48, { width, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#57534e');
  doc.text(`Invoice No: ${order.invoiceNumber ?? '—'}`, left, 74, { width, align: 'right' });
  doc.text(`Order ID: ${order.orderNumber}`, { width, align: 'right' });
  doc.text(`Order Date: ${date(order.createdAt)}`, { width, align: 'right' });
  doc.text(`Payment: ${order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online'} (${order.paymentStatus.replaceAll('_', ' ')})`, { width, align: 'right' });

  doc.moveTo(left, 136).lineTo(right, 136).strokeColor('#e7e5e4').stroke();

  // Customer
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1c1917').text('Billed to / Ship to', left, 150);
  doc.font('Helvetica').fontSize(9).fillColor('#44403c');
  doc.text(addr.fullName ?? order.user.name, left, 166);
  doc.text([addr.apartment, addr.address, addr.street].filter(Boolean).join(', '), { width: 300 });
  doc.text(`${addr.city}, ${addr.state} ${addr.pincode}`);
  if (addr.landmark) doc.text(`Landmark: ${addr.landmark}`);
  doc.text(`Phone: ${addr.phone ?? order.user.phone ?? '—'}  ·  ${order.user.email}`);

  // Items table
  let y = Math.max(doc.y + 20, 250);
  const cols = { item: left, qty: 300, price: 345, tax: 420, total: 480 };
  const header = () => {
    doc.rect(left, y, width, 22).fill('#f5f5f4');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1c1917');
    doc.text('Product', cols.item + 8, y + 7);
    doc.text('Qty', cols.qty, y + 7, { width: 35, align: 'right' });
    doc.text('Price', cols.price, y + 7, { width: 65, align: 'right' });
    doc.text('Tax', cols.tax, y + 7, { width: 50, align: 'right' });
    doc.text('Total', cols.total, y + 7, { width: right - cols.total - 8, align: 'right' });
    y += 28;
  };
  header();

  doc.font('Helvetica').fontSize(9);
  for (const item of order.items) {
    const name = item.variantLabel ? `${item.name}\n${item.variantLabel}  ·  SKU ${item.sku}` : `${item.name}\nSKU ${item.sku}`;
    const rowHeight = doc.heightOfString(name, { width: 240 }) + 10;
    if (y + rowHeight > 720) {
      doc.addPage();
      y = 48;
      header();
      doc.font('Helvetica').fontSize(9);
    }
    doc.fillColor('#1c1917').text(name, cols.item + 8, y, { width: 240 });
    doc.text(String(item.quantity), cols.qty, y, { width: 35, align: 'right' });
    doc.text(money(item.unitPrice), cols.price, y, { width: 65, align: 'right' });
    doc.text(`${item.taxRate}%`, cols.tax, y, { width: 50, align: 'right' });
    doc.text(money(item.lineTotal), cols.total, y, { width: right - cols.total - 8, align: 'right' });
    y += rowHeight;
    doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor('#e7e5e4').stroke();
  }

  // Totals
  if (y > 620) {
    doc.addPage();
    y = 48;
  }
  y += 10;
  const totalRow = (label: string, value: string, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9).fillColor(bold ? '#1c1917' : '#44403c');
    doc.text(label, 330, y, { width: 110 });
    doc.text(value, 440, y, { width: right - 448, align: 'right' });
    y += bold ? 20 : 15;
  };
  totalRow('Subtotal (MRP)', money(order.mrpTotal));
  if (order.discount > 0) totalRow('Discount', `- ${money(order.discount)}`);
  if (order.couponDiscount > 0) totalRow(`Coupon${order.couponCode ? ` (${order.couponCode})` : ''}`, `- ${money(order.couponDiscount)}`);
  totalRow('Shipping', order.shippingFee > 0 ? money(order.shippingFee) : 'Free');
  totalRow(order.taxInclusive ? 'Tax (included in prices)' : 'Tax', money(order.tax));
  doc.moveTo(330, y).lineTo(right, y).strokeColor('#d6d3d1').stroke();
  y += 8;
  totalRow('Grand Total', money(order.total), true);

  doc.font('Helvetica').fontSize(8).fillColor('#78716c');
  doc.text('This is a computer-generated invoice and does not require a signature.', left, 770, { width, align: 'center' });
  doc.end();
}
