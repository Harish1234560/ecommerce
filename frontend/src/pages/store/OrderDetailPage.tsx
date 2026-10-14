import { errorMessage } from '@/api/client';
import { SummaryRows } from '@/components/cart/SummaryRows';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/order/StatusBadges';
import { TrackingTimeline } from '@/components/order/TrackingTimeline';
import { Button, buttonClass } from '@/components/ui/Button';
import { Badge, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { PAYMENT_METHOD_LABEL, REFUND_STATUS } from '@/constants';
import { useOrder } from '@/hooks/useOrder';
import { usePayment } from '@/hooks/usePayment';
import { useSeo } from '@/hooks/useSeo';
import { CancelModal } from '@/sections/order/CancelModal';
import { ReturnModal } from '@/sections/order/ReturnModal';
import { orderService } from '@/services/orderService';
import { toast } from '@/store/toast';
import { formatAddress } from '@/utils/address';
import { formatDate, formatDateTime, money } from '@/utils/format';
import { cancelledUnpaidCod } from '@/utils/order';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download, Headphones, RotateCcw, Star, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const qc = useQueryClient();
  const { data: order, isLoading, error, refetch } = useOrder(orderId);
  const { pay, element } = usePayment();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  useSeo({ title: order ? `Order ${order.orderNumber}` : 'Order', noindex: true });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-48 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  if (error || !order) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const payment = order.payments[0];
  const a = order.shippingAddress;
  const completePayment = async () => {
    setPaying(true);
    const method = (['upi', 'card', 'netbanking', 'wallet'].includes(payment?.method ?? '') ? payment!.method : 'upi') as 'upi';
    const result = await pay(order.id, method);
    setPaying(false);
    if (result.status === 'paid') toast.success('Payment successful — your order is confirmed');
    else if (result.status === 'failed') toast.error(result.message);
    void qc.invalidateQueries({ queryKey: ['orders'] });
  };
  const downloadInvoice = async () => {
    setDownloading(true);
    try {
      await orderService.downloadInvoice(order.id, order.orderNumber);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/account/orders" className="text-sm font-medium text-stone-500 hover:text-stone-900">← All orders</Link>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">Order {order.orderNumber}</h1>
          <p className="text-sm text-stone-500">Placed on {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} cancelledCod={cancelledUnpaidCod(order)} />
        </div>
      </div>

      {order.canPay && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="flex items-start gap-2.5 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span><strong>Payment pending.</strong> {payment?.failureReason ? `Last attempt failed: ${payment.failureReason}. ` : ''}Complete the payment to confirm this order — unpaid orders are cancelled automatically.</span>
          </p>
          <Button variant="brand" loading={paying} onClick={() => void completePayment()} className="shrink-0">Pay {money(order.total)}</Button>
        </div>
      )}
      {order.cancelReason && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Cancelled on {formatDate(order.cancelledAt)} — {order.cancelReason}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {!['CANCELLED'].includes(order.status) && !order.canPay && <Link to={`/account/orders/${order.id}/tracking`} className={buttonClass('primary', 'sm')}><Truck className="h-4 w-4" /> Track order</Link>}
        {order.invoiceAvailable && <Button size="sm" variant="outline" loading={downloading} onClick={() => void downloadInvoice()} icon={<Download className="h-4 w-4" />}>Download Invoice</Button>}
        {order.canCancel && <Button size="sm" variant="outline" className="text-rose-600" onClick={() => setCancelOpen(true)} icon={<XCircle className="h-4 w-4" />}>Cancel Order</Button>}
        {order.canReturn && <Button size="sm" variant="outline" onClick={() => setReturnOpen(true)} icon={<RotateCcw className="h-4 w-4" />}>Return Product</Button>}
        <Link to={`/contact?order=${order.id}&ref=${order.orderNumber}`} className={buttonClass('ghost', 'sm')}><Headphones className="h-4 w-4" /> Contact Support</Link>
      </div>

      <section className="card p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">Items</h2>
        <ul className="divide-y divide-stone-200">
          {order.items.map((i) => (
            <li key={i.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
              <Link to={`/product/${i.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100"><Img src={i.image} alt={i.name} className="h-full w-full object-cover" /></Link>
              <div className="min-w-0 flex-1">
                <Link to={`/product/${i.slug}`} className="line-clamp-2 text-sm font-medium text-stone-900 hover:text-brand-700">{i.name}</Link>
                {i.variantLabel && <p className="text-xs text-stone-500">{i.variantLabel}</p>}
                <p className="mt-0.5 text-xs text-stone-500">Qty {i.quantity} × {money(i.unitPrice)}{i.returnedQty > 0 && <Badge className="ml-2">{i.returnedQty} returned</Badge>}</p>
                {order.deliveredAt && !order.reviewedProductIds.includes(i.productId) && (
                  <Link to={`/account/reviews?product=${i.productId}`} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"><Star className="h-3.5 w-3.5" /> Rate &amp; review</Link>
                )}
              </div>
              <p className="text-sm font-semibold tabular-nums text-stone-900">{money(i.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">Delivery address</h2>
          <p className="font-semibold text-stone-900">{a.fullName}</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">{formatAddress(a)}</p>
          <p className="text-sm text-stone-600">Phone: +91 {a.phone}</p>
          {order.trackingNumber && <p className="mt-3 border-t border-stone-200 pt-3 text-sm text-stone-600">{order.courier ?? 'Courier'} · Tracking no. <span className="font-semibold text-stone-900">{order.trackingNumber}</span></p>}
          <p className="mt-3 text-sm text-stone-600">{order.deliveredAt ? `Delivered on ${formatDate(order.deliveredAt)}` : order.cancelledAt ? '' : `Expected by ${formatDate(order.expectedDelivery)}`}</p>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">Payment</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-stone-500">Method</dt><dd className="font-medium text-stone-900">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : `Online${payment?.method ? ` · ${PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}` : ''}`}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-stone-500">Status</dt><dd><PaymentStatusBadge status={order.paymentStatus} cancelledCod={cancelledUnpaidCod(order)} /></dd></div>
            {payment?.transactionId && <div className="flex justify-between gap-3"><dt className="text-stone-500">Transaction ID</dt><dd className="truncate font-mono text-xs text-stone-900">{payment.transactionId}</dd></div>}
            {payment?.paidAt && <div className="flex justify-between gap-3"><dt className="text-stone-500">Paid on</dt><dd className="text-stone-900">{formatDateTime(payment.paidAt)}</dd></div>}
            {order.invoiceNumber && <div className="flex justify-between gap-3"><dt className="text-stone-500">Invoice</dt><dd className="text-stone-900">{order.invoiceNumber}</dd></div>}
          </dl>
        </section>
      </div>

      {order.refunds.length > 0 && (
        <section className="card p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">Returns &amp; refunds</h2>
          <ul className="space-y-3">
            {order.refunds.map((r) => (
              <li key={r.id} className="rounded-xl bg-stone-50 p-3.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-stone-900">{r.type === 'RETURN' ? 'Return' : 'Cancellation'} refund · {money(r.amount)}</span>
                  <Badge tone={REFUND_STATUS[r.status].tone}>{REFUND_STATUS[r.status].label}</Badge>
                </div>
                <p className="mt-1 text-stone-600">{r.reason}</p>
                <p className="mt-1 text-xs text-stone-500">
                  Requested {formatDate(r.createdAt)}
                  {r.status === 'COMPLETED' && r.completedAt ? ` · Refunded on ${formatDate(r.completedAt)}` : r.status === 'PROCESSING' ? ' · Sent to your bank — awaiting confirmation' : r.status === 'APPROVED' ? (r.type === 'RETURN' && order.status === 'RETURN_APPROVED' ? ' · Approved — pickup will be arranged' : ' · Refund will be initiated shortly') : ''}
                </p>
                {r.adminNote && r.status === 'REJECTED' && <p className="mt-1 text-xs text-rose-700">Reason: {r.adminNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-500">Order timeline</h2>
          <TrackingTimeline order={order} />
        </section>
        <section className="card h-fit p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">Price details</h2>
          <SummaryRows summary={order} />
        </section>
      </div>

      {cancelOpen && <CancelModal order={order} open onClose={() => setCancelOpen(false)} />}
      {returnOpen && <ReturnModal order={order} open onClose={() => setReturnOpen(false)} />}
      {element}
    </div>
  );
}
