import { CartItem } from '@/components/cart/CartItem';
import { CouponBox } from '@/components/cart/CouponBox';
import { MobileActionBar } from '@/components/cart/MobileActionBar';
import { SummaryRows } from '@/components/cart/SummaryRows';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { Price } from '@/components/ui/Price';
import { useCart } from '@/hooks/useCart';
import { useSeo } from '@/hooks/useSeo';
import { toast } from '@/store/toast';
import { money } from '@/utils/format';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function CartPage() {
  useSeo({ title: 'Your Cart', noindex: true });
  const navigate = useNavigate();
  const { cart, query, saveForLater, remove } = useCart();
  const { summary } = cart;

  if (query.isLoading) {
    return (
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const empty = cart.items.length === 0;
  const toFree = summary.freeShippingAbove != null ? summary.freeShippingAbove - (summary.subtotal - summary.couponDiscount) : 0;

  return (
    <div className="container-page py-6 lg:py-10">
      <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Shopping cart {!empty && <span className="text-base font-medium text-stone-500">({summary.itemCount} item{summary.itemCount === 1 ? '' : 's'})</span>}</h1>

      {empty ? (
        <div className="card mt-6">
          <EmptyState icon={<ShoppingCart />} title="Your cart is empty" message="Looks like you have not added anything yet." action={<Link to="/products" className={buttonClass('primary')}>Continue shopping</Link>} />
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            {summary.freeShippingAbove != null && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
                <Truck className="h-5 w-5 shrink-0 text-brand-700" />
                {toFree > 0 ? <span>Add <strong>{money(toFree)}</strong> more to get <strong>free delivery</strong>.</span> : <span>You have unlocked <strong>free delivery</strong>.</span>}
              </div>
            )}
            <div className="card px-4 sm:px-6">
              <ul className="divide-y divide-stone-200">
                <AnimatePresence initial={false}>
                  {cart.items.map((line) => <CartItem key={line.id} line={line} />)}
                </AnimatePresence>
              </ul>
            </div>
            <Link to="/products" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">← Continue shopping</Link>
          </div>

          <aside className="lg:sticky lg:top-44 lg:self-start">
            <div className="card space-y-5 p-5 sm:p-6">
              <h2 className="text-lg font-bold text-stone-900">Order summary</h2>
              <CouponBox />
              <SummaryRows summary={summary} />
              {summary.discount + summary.couponDiscount > 0 && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-800">You save {money(summary.discount + summary.couponDiscount)} on this order</p>
              )}
              {cart.hasIssues && (
                <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Some items need your attention before you can check out.
                </p>
              )}
              <Button size="lg" block className="hidden lg:inline-flex" disabled={cart.hasIssues} onClick={() => navigate('/checkout/address')} icon={<ArrowRight className="order-last h-5 w-5" />}>
                Proceed to Checkout
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-stone-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Safe and secure payments</p>
            </div>
          </aside>
        </div>
      )}

      {!empty && (
        <MobileActionBar total={summary.total}>
          <Button size="lg" block disabled={cart.hasIssues} onClick={() => navigate('/checkout/address')}>Proceed to Checkout</Button>
        </MobileActionBar>
      )}

      {cart.saved.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-stone-900">Saved for later ({cart.saved.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cart.saved.map((line) => (
              <div key={line.id} className="card flex gap-3 p-3">
                <Link to={`/product/${line.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100"><Img src={line.image} alt={line.name} className="h-full w-full object-cover" /></Link>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-stone-900">{line.name}</p>
                  {line.variantLabel && <p className="text-xs text-stone-500">{line.variantLabel}</p>}
                  {line.issue === 'UNAVAILABLE' || line.issue === 'OUT_OF_STOCK' ? <p className="mt-1 text-xs font-semibold text-rose-600">{line.issueMessage}</p> : <Price price={line.unitPrice} mrp={line.mrp} size="sm" className="mt-1" />}
                  <div className="mt-2 flex gap-4">
                    <button className="text-xs font-semibold text-brand-700 hover:underline disabled:text-stone-400" disabled={line.issue === 'UNAVAILABLE' || line.issue === 'OUT_OF_STOCK'} onClick={() => saveForLater.mutate({ line, saved: false }, { onSuccess: () => toast.success('Moved to cart') })}>Move to cart</button>
                    <button className="text-xs font-semibold text-stone-500 hover:text-rose-600" onClick={() => remove.mutate(line)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
