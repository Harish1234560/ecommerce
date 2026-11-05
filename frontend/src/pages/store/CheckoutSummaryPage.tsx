import { CouponBox } from '@/components/cart/CouponBox';
import { MobileActionBar } from '@/components/cart/MobileActionBar';
import { SummaryRows } from '@/components/cart/SummaryRows';
import { Button } from '@/components/ui/Button';
import { ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { useCheckoutData } from '@/hooks/useCheckoutData';
import { useSeo } from '@/hooks/useSeo';
import { CheckoutItems } from '@/sections/checkout/CheckoutItems';
import { CheckoutShell } from '@/sections/checkout/CheckoutShell';
import { formatAddress } from '@/utils/address';
import { formatDate } from '@/utils/format';
import { AlertTriangle, MapPin, Truck } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

export function CheckoutSummaryPage() {
  useSeo({ title: 'Checkout — Order Summary', noindex: true });
  const navigate = useNavigate();
  const { address, addresses, cart, query } = useCheckoutData();

  if (query.isLoading || addresses.isLoading) return <PageSpinner />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (cart.items.length === 0) return <Navigate to="/cart" replace />;
  if (!address) return <Navigate to="/checkout/address" replace />;

  const eta = new Date(Date.now() + cart.shipping.maxDays * 86_400_000);
  const blocked = cart.hasIssues || !cart.shipping.deliverable;

  return (
    <CheckoutShell
      step={2}
      title="Review your order"
      aside={
        <div className="card space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-stone-900">Price details</h2>
          <CouponBox pincode={address.pincode} />
          <SummaryRows summary={cart.summary} />
          <Button size="lg" block className="hidden lg:inline-flex" disabled={blocked} onClick={() => navigate('/checkout/payment')}>Continue to payment</Button>
        </div>
      }
      bar={<MobileActionBar total={cart.summary.total}><Button size="lg" block disabled={blocked} onClick={() => navigate('/checkout/payment')}>Continue to payment</Button></MobileActionBar>}
    >
      <div className="space-y-4">
        <section className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-500"><MapPin className="h-4 w-4" /> Deliver to</h2>
            <Link to="/checkout/address" className="text-sm font-semibold text-brand-700 hover:underline">Change</Link>
          </div>
          <p className="mt-2 font-semibold text-stone-900">{address.fullName}</p>
          <p className="mt-0.5 text-sm leading-6 text-stone-600">{formatAddress(address)}</p>
          <p className="text-sm text-stone-600">Phone: +91 {address.phone}</p>
          {cart.shipping.deliverable ? (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
              <Truck className="h-4 w-4 text-brand-700" /> Estimated delivery by <strong>{formatDate(eta, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
            </p>
          ) : (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              <AlertTriangle className="h-4 w-4" /> We do not deliver to PIN code {address.pincode} yet. Please choose another address.
            </p>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Items ({cart.summary.itemCount})</h2>
            <Link to="/cart" className="text-sm font-semibold text-brand-700 hover:underline">Edit cart</Link>
          </div>
          <CheckoutItems />
          {cart.hasIssues && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Some items are unavailable in the selected quantity. <Link to="/cart" className="font-semibold underline">Fix in cart</Link>
            </p>
          )}
        </section>
      </div>
    </CheckoutShell>
  );
}
