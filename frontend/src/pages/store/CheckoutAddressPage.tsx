import { AddressFormModal } from '@/components/address/AddressForm';
import { clsx } from '@/components/ui';
import { Button, buttonClass } from '@/components/ui/Button';
import { Badge, ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { useAddresses } from '@/hooks/useAddresses';
import { useCart } from '@/hooks/useCart';
import { useSeo } from '@/hooks/useSeo';
import { CheckoutShell } from '@/sections/checkout/CheckoutShell';
import { useCheckout } from '@/store/checkout';
import { formatAddress } from '@/utils/address';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

export function CheckoutAddressPage() {
  useSeo({ title: 'Checkout — Address', noindex: true });
  const navigate = useNavigate();
  const { addressId, setAddress } = useCheckout();
  const { data: addresses, isLoading, error, refetch } = useAddresses();
  const { cart, query } = useCart();
  const [adding, setAdding] = useState(false);

  // Default the selection to the saved default address.
  useEffect(() => {
    if (!addresses) return;
    if (!addressId || !addresses.some((a) => a.id === addressId)) setAddress(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null);
  }, [addresses, addressId, setAddress]);

  if (query.isLoading || isLoading) return <PageSpinner />;
  if (cart.items.length === 0) return <Navigate to="/cart" replace />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <CheckoutShell step={1} title="Select a delivery address">
      <div className="grid gap-4 sm:grid-cols-2">
        {addresses?.map((a) => {
          const selected = a.id === addressId;
          return (
            <label key={a.id} className={clsx('card relative flex cursor-pointer gap-3 p-5 transition', selected ? 'border-ink ring-1 ring-ink' : 'hover:border-stone-300')}>
              <input type="radio" name="address" className="mt-1 h-4 w-4 accent-ink" checked={selected} onChange={() => setAddress(a.id)} />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold text-stone-900">{a.fullName}{a.isDefault && <Badge tone="success">Default</Badge>}</span>
                <span className="mt-1 block text-sm leading-6 text-stone-600">{formatAddress(a)}</span>
                <span className="mt-1 block text-sm text-stone-600">Phone: +91 {a.phone}</span>
              </span>
            </label>
          );
        })}
        <button onClick={() => setAdding(true)} className="flex min-h-[9rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 p-5 text-sm font-semibold text-stone-600 transition hover:border-stone-400 hover:text-stone-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100"><Plus className="h-5 w-5" /></span>
          Add a new address
        </button>
      </div>
      <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <Link to="/cart" className={buttonClass('outline')}>Back to cart</Link>
        <Button size="lg" disabled={!addressId} onClick={() => navigate('/checkout')}>Deliver to this address</Button>
      </div>
      <AddressFormModal open={adding} onClose={() => setAdding(false)} onSaved={(a) => setAddress(a.id)} />
    </CheckoutShell>
  );
}
