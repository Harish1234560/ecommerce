import { PaymentStatusBadge } from '@/components/order/StatusBadges';
import { clsx } from '@/components/ui';
import { buttonClass } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { PAYMENT_METHOD_LABEL } from '@/constants';
import { useSeo } from '@/hooks/useSeo';
import { Stepper } from '@/sections/checkout/CheckoutShell';
import { orderService } from '@/services/orderService';
import { formatAddress } from '@/utils/address';
import { formatDate, money } from '@/utils/format';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

export function OrderSuccessPage() {
  useSeo({ title: 'Order Placed', noindex: true });
  const { orderId = '' } = useParams();
  const qc = useQueryClient();
  const { data: order, isLoading, error, refetch } = useQuery({ queryKey: ['orders', orderId], queryFn: () => orderService.get(orderId) });
  // The order emptied the cart on the server — refresh the cart badge and cart page.
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ['cart'] });
  }, [qc, orderId]);

  if (isLoading) return <div className="container-page max-w-2xl py-10"><Skeleton className="h-96 w-full rounded-3xl" /></div>;
  if (error || !order) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const unpaid = order.canPay;
  const a = order.shippingAddress;
  return (
    <div className="container-page max-w-3xl py-6 lg:py-10">
      <Stepper current={unpaid ? 3 : 5} />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className={clsx('px-6 py-10 text-center', unpaid ? 'bg-amber-50' : 'bg-brand-50')}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }} className={clsx('mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white', unpaid ? 'bg-amber-500' : 'bg-brand-600')}>
            {unpaid ? <AlertTriangle className="h-8 w-8" /> : <CheckCircle2 className="h-9 w-9" />}
          </motion.div>
          <h1 className="mt-4 text-2xl font-bold text-stone-900 sm:text-3xl">{unpaid ? 'Payment pending' : 'Order Placed Successfully'}</h1>
          <p className="mt-1.5 text-sm text-stone-600">
            {unpaid ? 'Complete the payment to confirm this order.' : `Thank you! We have emailed the details and will notify you when it ships.`}
          </p>
        </div>

        <dl className="grid gap-x-6 gap-y-5 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Order ID</dt>
            <dd className="mt-1 font-semibold text-stone-900">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Payment status</dt>
            <dd className="mt-1 flex items-center gap-2 text-sm text-stone-700">
              <PaymentStatusBadge status={order.paymentStatus} />
              {order.paymentMethod === 'COD' ? 'Cash on Delivery' : (PAYMENT_METHOD_LABEL[order.payments[0]?.method ?? ''] ?? 'Online')}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total amount</dt>
            <dd className="mt-1 text-lg font-bold text-stone-900">{money(order.total)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Expected delivery</dt>
            <dd className="mt-1 font-semibold text-stone-900">{formatDate(order.expectedDelivery, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Delivery address</dt>
            <dd className="mt-1 text-sm leading-6 text-stone-700"><span className="font-semibold text-stone-900">{a.fullName}</span>, {formatAddress(a)} · +91 {a.phone}</dd>
          </div>
        </dl>

        <div className="border-t border-stone-200 px-6 py-4">
          <ul className="divide-y divide-stone-100">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2.5">
                <Img src={i.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 text-sm"><span className="line-clamp-1 font-medium text-stone-900">{i.name}</span><span className="text-xs text-stone-500">{i.variantLabel ? `${i.variantLabel} · ` : ''}Qty {i.quantity}</span></span>
                <span className="text-sm font-semibold tabular-nums">{money(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 border-t border-stone-200 bg-stone-50 p-5 sm:flex-row sm:justify-center">
          {unpaid ? (
            <Link to={`/account/orders/${order.id}`} className={buttonClass('primary')}>Complete payment</Link>
          ) : (
            <Link to={`/account/orders/${order.id}/tracking`} className={buttonClass('primary')}>Track Order</Link>
          )}
          <Link to={`/account/orders/${order.id}`} className={buttonClass('outline')}>View Order</Link>
          <Link to="/products" className={buttonClass('ghost')}>Continue Shopping</Link>
        </div>
      </motion.div>
    </div>
  );
}
