import { ApiError, errorMessage } from '@/api/client';
import { MobileActionBar } from '@/components/cart/MobileActionBar';
import { SummaryRows } from '@/components/cart/SummaryRows';
import { clsx } from '@/components/ui';
import { Button, buttonClass } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Feedback';
import { useCheckoutData } from '@/hooks/useCheckoutData';
import { usePayment } from '@/hooks/usePayment';
import { useSeo } from '@/hooks/useSeo';
import { useSettings } from '@/hooks/useSettings';
import { CheckoutShell } from '@/sections/checkout/CheckoutShell';
import { orderService } from '@/services/orderService';
import { useCheckout } from '@/store/checkout';
import { toast } from '@/store/toast';
import type { OnlineMethod } from '@/types';
import { formatAddress } from '@/utils/address';
import { money } from '@/utils/format';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Banknote, CreditCard, Landmark, Lock, Smartphone, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

type CheckoutMethod = OnlineMethod | 'credit' | 'debit' | 'cod';

const CHECKOUT_METHODS: { id: CheckoutMethod; label: string; hint: string; icon: typeof CreditCard }[] = [
  { id: 'upi', label: 'UPI', hint: 'Google Pay, PhonePe, Paytm, BHIM', icon: Smartphone },
  { id: 'credit', label: 'Credit Card', hint: 'Visa, Mastercard, RuPay, Amex', icon: CreditCard },
  { id: 'debit', label: 'Debit Card', hint: 'All major banks', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', hint: 'Pay directly from your bank account', icon: Landmark },
  { id: 'wallet', label: 'Wallet', hint: 'Paytm, Mobikwik, Freecharge and more', icon: Wallet },
  { id: 'cod', label: 'Cash on Delivery', hint: 'Pay in cash when your order arrives', icon: Banknote },
];

const gatewayMethod = (m: CheckoutMethod): OnlineMethod => (m === 'credit' || m === 'debit' ? 'card' : (m as OnlineMethod));

export function CheckoutPaymentPage() {
  useSeo({ title: 'Checkout — Payment', noindex: true });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const { idempotencyKey, newAttempt } = useCheckout();
  const { address, addresses, cart, query } = useCheckoutData();
  const { pay, element } = usePayment();

  const [method, setMethod] = useState<CheckoutMethod | null>(null);
  const [placing, setPlacing] = useState(false);
  // Set once an order exists: the cart is empty from then on, which must not bounce the customer back to /cart.
  const placed = useRef(false);
  // An order that was created but whose online payment did not complete yet.
  const [pending, setPending] = useState<{ id: string; orderNumber: string; message: string } | null>(null);

  const codLimit = settings?.payment.codMaxAmount ?? 0;
  const overCodLimit = codLimit > 0 && cart.summary.total > codLimit;
  const codAllowed = !!settings?.payment.codEnabled && cart.shipping.codAvailable;
  const onlineAllowed = settings?.payment.onlineEnabled !== false;
  const free = cart.summary.total === 0;
  const available = (m: CheckoutMethod) => (m === 'cod' ? codAllowed && !overCodLimit : onlineAllowed);

  useEffect(() => {
    if (method === null && settings) setMethod(onlineAllowed ? 'upi' : 'cod');
  }, [method, settings, onlineAllowed]);

  if (pending) {
    const retry = async () => {
      setPlacing(true);
      const result = await pay(pending.id, gatewayMethod(method && method !== 'cod' ? method : 'upi'));
      setPlacing(false);
      if (result.status === 'paid') navigate(`/order/success/${pending.id}`, { replace: true });
      else setPending({ ...pending, message: result.status === 'cancelled' ? 'You cancelled the payment.' : result.message });
    };
    return (
      <CheckoutShell step={3} title="Payment not completed">
        <div className="card mx-auto max-w-lg p-6 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600"><AlertTriangle className="h-7 w-7" /></div>
          <h2 className="mt-4 text-lg font-bold text-stone-900">Order {pending.orderNumber} is awaiting payment</h2>
          <p className="mt-1.5 text-sm text-stone-600" role="alert">{pending.message}</p>
          <p className="mt-1 text-sm text-stone-500">Your items are reserved for a short time. No money has been charged unless your bank says otherwise — in that case it is refunded automatically.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button loading={placing} onClick={() => void retry()}>Retry payment</Button>
            <Link to={`/account/orders/${pending.id}`} className={buttonClass('outline')}>View order</Link>
          </div>
        </div>
        {element}
      </CheckoutShell>
    );
  }

  if (query.isLoading || addresses.isLoading) return <PageSpinner />;
  if (cart.items.length === 0 && !placed.current) return <Navigate to="/cart" replace />;
  if (!address) return <Navigate to="/checkout/address" replace />;

  const placeOrder = async () => {
    if (!method) return;
    setPlacing(true);
    try {
      const order = await orderService.place({ addressId: address.id, paymentMethod: method === 'cod' ? 'COD' : 'ONLINE' }, idempotencyKey);
      placed.current = true;
      newAttempt();
      void qc.invalidateQueries({ queryKey: ['orders'] });

      // The confirmation page refreshes the cart once it is on screen.
      if (!order.requiresPayment) {
        navigate(`/order/success/${order.id}`, { replace: true });
        return;
      }
      const result = await pay(order.id, gatewayMethod(method));
      if (result.status === 'paid') {
        navigate(`/order/success/${order.id}`, { replace: true });
      } else {
        setPending({ id: order.id, orderNumber: order.orderNumber, message: result.status === 'cancelled' ? 'You cancelled the payment.' : result.message });
        void qc.invalidateQueries({ queryKey: ['cart'] });
      }
    } catch (err) {
      toast.error(errorMessage(err));
      // The cart changed under us (stock, price or coupon) — send the customer back to review it.
      if (err instanceof ApiError && ['CART_INVALID', 'OUT_OF_STOCK', 'COUPON_INVALID'].includes(err.code ?? '')) {
        void qc.invalidateQueries({ queryKey: ['cart'] });
        navigate('/cart');
      }
    } finally {
      setPlacing(false);
    }
  };

  const canPlace = !!method && available(method) && !cart.hasIssues && cart.shipping.deliverable;
  const placeLabel = free || method === 'cod' ? 'Place Order' : `Pay ${money(cart.summary.total)}`;

  return (
    <CheckoutShell
      step={3}
      title="Choose a payment method"
      bar={<MobileActionBar total={cart.summary.total}><Button size="lg" block loading={placing} disabled={!canPlace} onClick={() => void placeOrder()} icon={<Lock className="h-4 w-4" />}>{placeLabel}</Button></MobileActionBar>}
      aside={
        <div className="card space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-stone-900">Order total</h2>
          <SummaryRows summary={cart.summary} />
          <Button size="lg" block className="hidden lg:inline-flex" loading={placing} disabled={!canPlace} onClick={() => void placeOrder()} icon={<Lock className="h-4 w-4" />}>
            {placeLabel}
          </Button>
          <p className="text-center text-xs leading-5 text-stone-500">
            By placing the order you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/return-policy" className="underline">Return policy</Link>.
          </p>
        </div>
      }
    >
      <div className="card divide-y divide-stone-200" role="radiogroup" aria-label="Payment method">
        {CHECKOUT_METHODS.map(({ id, label, hint, icon: Icon }) => {
          const enabled = available(id);
          const selected = method === id;
          return (
            <label key={id} className={clsx('flex items-center gap-4 p-4 transition-colors sm:p-5', enabled ? 'cursor-pointer hover:bg-stone-50' : 'cursor-not-allowed opacity-50', selected && 'bg-stone-50')}>
              <input type="radio" name="payment" className="h-4 w-4 accent-ink" checked={selected} disabled={!enabled} onChange={() => setMethod(id)} />
              <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', selected ? 'bg-ink text-white' : 'bg-stone-100 text-stone-600')}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-stone-900">{label}</span>
                <span className="block text-xs text-stone-500">
                  {enabled ? hint : id === 'cod' ? (overCodLimit && codAllowed ? `Available for orders up to ${money(codLimit)}` : 'Not available for this address') : 'Currently unavailable'}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-stone-500">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
        Online payments are completed on our payment partner's secure page. We never see or store your card number, CVV or UPI PIN.
      </p>
      <div className="mt-4 card p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-stone-500">Delivering to</p>
        <p className="mt-1.5 text-sm text-stone-700"><span className="font-semibold text-stone-900">{address.fullName}</span> — {formatAddress(address)}</p>
      </div>
      <div className="mt-6">
        <Link to="/checkout" className={buttonClass('outline')}>Back to summary</Link>
      </div>
      {element}
    </CheckoutShell>
  );
}
