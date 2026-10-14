import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { PageHeader } from '@/components/admin/PageHeader';
import { OrderBadge, PayBadge } from '@/components/admin/StatusBadges';
import { Button, buttonClass } from '@/components/ui/Button';
import { Badge, ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { REFUND_STATUS } from '@/constants';
import { useSeo } from '@/hooks/useSeo';
import { ACTION_LABEL, statusLabel } from '@/sections/admin/orders/labels';
import { RefundActions } from '@/sections/admin/orders/RefundActions';
import { StatusModal } from '@/sections/admin/orders/StatusModal';
import { adminOrderService } from '@/services/adminService';
import { toast } from '@/store/toast';
import type { OrderStatus } from '@/types';
import { formatAddress } from '@/utils/address';
import { formatDate, formatDateTime, money } from '@/utils/format';
import { methodLabel } from '@/utils/order';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const [action, setAction] = useState<OrderStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { data: order, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'order', id], queryFn: () => adminOrderService.get(id), refetchInterval: 15_000 });
  useSeo({ title: order ? `Order ${order.orderNumber} — Admin` : 'Order — Admin', noindex: true });

  if (isLoading) return <PageSpinner />;
  if (error || !order) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const payment = order.payments[0];
  const viaGateway = !!payment && payment.gateway !== 'COD' && !!payment.gatewayPaymentId;
  const forward = order.nextStatuses.filter((s) => s !== 'CANCELLED' && s !== 'RETURNED');
  const invoice = async () => {
    setDownloading(true);
    try {
      await adminOrderService.downloadInvoice(order.id, order.orderNumber);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`Placed ${formatDateTime(order.createdAt)}`}
        actions={
          <>
            <Link to="/admin/orders" className={buttonClass('outline', 'sm')}><ArrowLeft className="h-4 w-4" /> Orders</Link>
            {order.invoiceNumber && <Button size="sm" variant="outline" loading={downloading} onClick={() => void invoice()} icon={<Download className="h-4 w-4" />}>Invoice</Button>}
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">Order status</span><OrderBadge status={order.status} />
            <span className="ml-3 text-sm text-slate-500">Payment</span><PayBadge status={order.paymentStatus} />
            <Badge>{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online'}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {forward.map((s, i) => <Button key={s} size="sm" variant={i === 0 ? 'primary' : 'outline'} onClick={() => setAction(s)}>{ACTION_LABEL[s] ?? statusLabel(s)}</Button>)}
            {order.nextStatuses.includes('CANCELLED') && <Button size="sm" variant="outline" className="text-rose-600" onClick={() => setAction('CANCELLED')}>Cancel</Button>}
          </div>
        </div>
        {order.awaitingPayment && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">Awaiting online payment from the customer. It will confirm automatically when the payment is verified, or be cancelled if it is not completed in time.</p>}
        {order.cancelReason && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">Cancelled: {order.cancelReason}</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Card title="Products" padded={false}>
            <ul className="divide-y divide-slate-100">
              {order.items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
                  <Img src={i.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-[9rem] flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{i.name}</p>
                    <p className="text-xs text-slate-500">SKU {i.sku}{i.variantLabel && ` · ${i.variantLabel}`}{i.returnedQty > 0 && ` · ${i.returnedQty} returned`}</p>
                  </div>
                  <p className="ml-auto text-sm tabular-nums text-slate-600">{i.quantity} × {money(i.unitPrice)}</p>
                  <p className="w-24 text-right text-sm font-semibold tabular-nums text-slate-900">{money(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-slate-200 bg-slate-50/60 px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal (MRP)</dt><dd className="tabular-nums">{money(order.mrpTotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="tabular-nums">− {money(order.discount)}</dd></div>}
              {order.couponDiscount > 0 && <div className="flex justify-between"><dt className="text-slate-500">Coupon {order.couponCode && `(${order.couponCode})`}</dt><dd className="tabular-nums">− {money(order.couponDiscount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-slate-500">Delivery fee</dt><dd className="tabular-nums">{order.shippingFee ? money(order.shippingFee) : 'Free'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Tax {order.taxInclusive && '(included)'}</dt><dd className="tabular-nums">{money(order.tax)}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900"><dt>Amount</dt><dd className="tabular-nums">{money(order.total)}</dd></div>
            </dl>
          </Card>

          {order.refunds.length > 0 && (
            <Card title="Returns & refunds">
              <ul className="space-y-4">
                {order.refunds.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{r.type === 'RETURN' ? 'Return' : 'Cancellation'} · {money(r.amount)}</p>
                      <Badge tone={REFUND_STATUS[r.status].tone}>{REFUND_STATUS[r.status].label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{r.reason}</p>
                    {r.items.length > 0 && <p className="mt-1 text-xs text-slate-500">Items: {r.items.map((it) => `${order.items.find((i) => i.id === it.orderItemId)?.name ?? 'Item'} × ${it.quantity}`).join(', ')}</p>}
                    <p className="mt-1 text-xs text-slate-500">Requested {formatDateTime(r.createdAt)}{r.completedAt && ` · Completed ${formatDateTime(r.completedAt)}`}{r.reference && ` · Ref ${r.reference}`}{r.gatewayRefundId && ` · ${r.gatewayRefundId}`}</p>
                    {r.adminNote && <p className="mt-1 text-xs text-slate-600">Note: {r.adminNote}</p>}
                    <div className="mt-3"><RefundActions refund={r} orderStatus={order.status} viaGateway={viaGateway} /></div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Timeline">
            <ol className="relative space-y-5 border-l-2 border-slate-200 pl-5">
              {order.history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-600" />
                  <p className="text-sm font-semibold text-slate-900">{statusLabel(h.status)} <span className="ml-1 text-xs font-normal capitalize text-slate-400">by {h.actor ?? 'system'}</span></p>
                  <p className="text-xs text-slate-500">{formatDateTime(h.createdAt)}</p>
                  {h.note && <p className="mt-0.5 text-sm text-slate-600">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="Customer">
            <p className="font-semibold text-slate-900">{order.user.name}</p>
            <p className="text-sm text-slate-600">{order.user.email}</p>
            {order.user.phone && <p className="text-sm text-slate-600">+91 {order.user.phone}</p>}
            <p className="mt-1 text-xs text-slate-500">Customer since {formatDate(order.user.createdAt)}</p>
            <Link to={`/admin/orders?customerId=${order.user.id}`} className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:underline">View all orders</Link>
          </Card>
          <Card title="Address">
            <p className="font-semibold text-slate-900">{order.shippingAddress.fullName}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{formatAddress(order.shippingAddress)}</p>
            <p className="text-sm text-slate-600">Phone: +91 {order.shippingAddress.phone}</p>
            {order.trackingNumber && <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">{order.courier ?? 'Courier'} · <span className="font-mono text-xs">{order.trackingNumber}</span></p>}
            {order.expectedDelivery && <p className="mt-1 text-xs text-slate-500">Expected by {formatDate(order.expectedDelivery)}</p>}
            {order.notes && <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-600">Customer note: {order.notes}</p>}
          </Card>
          <Card title="Payment">
            {order.payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payment attempt yet.</p>
            ) : (
              <ul className="space-y-3">
                {order.payments.map((p) => (
                  <li key={p.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{money(p.amount)} · {methodLabel(p.method, p.gateway)}</span>
                      <PayBadge status={p.status} />
                    </div>
                    <dl className="mt-1.5 space-y-0.5 text-xs text-slate-500">
                      <div>Gateway: {p.gateway}</div>
                      {p.gatewayPaymentId && <div className="break-all">Transaction ID: <span className="font-mono">{p.gatewayPaymentId}</span></div>}
                      {p.reference && <div>Reference: {p.reference}</div>}
                      {p.paidAt && <div>Paid: {formatDateTime(p.paidAt)}</div>}
                      {p.refundedAmount > 0 && <div>Refunded: {money(p.refundedAmount)}</div>}
                      {p.failureReason && <div className="text-rose-600">Failed: {p.failureReason}</div>}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      {action && <StatusModal order={order} status={action} onClose={() => setAction(null)} />}
    </div>
  );
}
