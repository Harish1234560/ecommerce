import { errorMessage } from '@/api/client';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { SectionHeading } from '@/components/common/SectionHeading';
import { ProductGrid } from '@/components/product/ProductGrid';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Badge, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Price } from '@/components/ui/Price';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Stars } from '@/components/ui/Rating';
import { useCart } from '@/hooks/useCart';
import { useSeo } from '@/hooks/useSeo';
import { useSettings } from '@/hooks/useSettings';
import { useWishlist } from '@/hooks/useWishlist';
import { DeliveryCheck } from '@/sections/product/DeliveryCheck';
import { Gallery } from '@/sections/product/Gallery';
import { ProductReviews } from '@/sections/product/ProductReviews';
import { catalogService } from '@/services/catalogService';
import { toast } from '@/store/toast';
import { useQuery } from '@tanstack/react-query';
import { Heart, RefreshCw, ShieldCheck, ShoppingBag, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

function DetailSkeleton() {
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-3xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { add } = useCart();
  const wishlist = useWishlist();
  const { data: product, isLoading, error, refetch } = useQuery({ queryKey: ['product', slug], queryFn: () => catalogService.product(slug) });

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'description' | 'specs'>('description');
  const [buying, setBuying] = useState(false);

  const sizes = useMemo(() => [...new Set(product?.variants.map((v) => v.size).filter((s): s is string => !!s))], [product]);
  const colors = useMemo(() => [...new Set(product?.variants.map((v) => v.color).filter((c): c is string => !!c))], [product]);

  // Preselect the first variant that is in stock.
  useEffect(() => {
    if (!product) return;
    const first = product.variants.find((v) => v.available > 0) ?? product.variants[0];
    setSize(first?.size ?? null);
    setColor(first?.color ?? null);
    setQty(1);
    setTab('description');
  }, [product]);

  const variant = product?.hasVariants ? product.variants.find((v) => (sizes.length === 0 || v.size === size) && (colors.length === 0 || v.color === color)) ?? null : null;
  const price = variant?.sellingPrice ?? product?.sellingPrice ?? 0;
  const mrp = variant?.price ?? product?.price ?? 0;
  const available = product ? (product.hasVariants ? (variant?.available ?? 0) : product.available) : 0;
  const maxQty = Math.max(1, Math.min(available, 10));

  useSeo({
    title: product?.name,
    description: product?.description.slice(0, 160),
    image: product?.images[0]?.url,
    jsonLd: product
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description,
          sku: product.sku,
          image: product.images.map((i) => i.url),
          ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
          ...(product.ratingCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.ratingAvg, reviewCount: product.ratingCount } } : {}),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: (product.sellingPrice / 100).toFixed(2),
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: window.location.href,
          },
        }
      : null,
  });

  if (isLoading) return <DetailSkeleton />;
  if (error || !product) {
    return (
      <div className="container-page py-10">
        <ErrorState error={error} onRetry={() => void refetch()} />
        <p className="text-center"><Link to="/products" className="text-sm font-semibold text-brand-700 hover:underline">Browse all products</Link></p>
      </div>
    );
  }

  const needsChoice = product.hasVariants && !variant;
  const canBuy = available > 0 && !needsChoice;
  const wished = wishlist.has(product.id);
  const optionAvailable = (kind: 'size' | 'color', value: string) =>
    product.variants.some((v) => v[kind] === value && (kind === 'size' ? colors.length === 0 || !color || v.color === color : sizes.length === 0 || !size || v.size === size) && v.available > 0);

  const addToCart = async (thenCheckout: boolean) => {
    if (needsChoice) return toast.error('Please choose the available options first');
    try {
      if (thenCheckout) setBuying(true);
      await add.mutateAsync({ productId: product.id, variantId: variant?.id ?? null, quantity: qty });
      if (thenCheckout) navigate('/checkout/address');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBuying(false);
    }
  };

  const chip = (selected: boolean, enabled: boolean) =>
    clsx(
      'relative min-w-[3rem] rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors',
      selected ? 'border-ink bg-ink text-white' : enabled ? 'border-stone-300 bg-white text-stone-800 hover:border-stone-500' : 'border-stone-200 bg-stone-50 text-stone-400 line-through',
    );

  return (
    <div className="container-page space-y-14 py-5 lg:py-8">
      <div>
        <Breadcrumbs items={[{ label: product.category.name, to: `/category/${product.category.slug}` }, { label: product.name }]} />
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="lg:sticky lg:top-44 lg:self-start">
            <Gallery images={product.images} name={product.name} />
          </div>

          <div>
            {product.brand && <p className="text-xs font-bold uppercase tracking-widest text-brand-700">{product.brand}</p>}
            <h1 className="mt-1 text-2xl font-bold leading-tight text-stone-900 sm:text-3xl">{product.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {product.ratingCount > 0 ? (
                <a href="#reviews" className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900">
                  <Stars value={product.ratingAvg} size="md" />
                  <span className="font-semibold text-stone-800">{product.ratingAvg.toFixed(1)}</span>
                  <span className="underline underline-offset-2">{product.ratingCount} review{product.ratingCount === 1 ? '' : 's'}</span>
                </a>
              ) : (
                <span className="text-sm text-stone-500">No reviews yet</span>
              )}
              {product.isBestSeller && <Badge tone="warning">Best seller</Badge>}
            </div>

            <div className="mt-5">
              <Price price={price} mrp={mrp} size="xl" />
              <p className="mt-1 text-xs text-stone-500">{settings?.tax.pricesIncludeTax === false ? 'Taxes calculated at checkout' : 'Inclusive of all taxes'}</p>
            </div>

            <p className="mt-4 text-sm font-semibold" aria-live="polite">
              {needsChoice ? (
                <span className="text-stone-500">Select options to see availability</span>
              ) : available <= 0 ? (
                <span className="text-rose-600">Out of stock</span>
              ) : available <= 5 ? (
                <span className="text-amber-700">Only {available} left — order soon</span>
              ) : (
                <span className="text-emerald-700">In stock</span>
              )}
            </p>

            {colors.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-stone-900">Color: <span className="font-normal text-stone-600">{color ?? 'Select'}</span></p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
                  {colors.map((c) => (
                    <button key={c} role="radio" aria-checked={color === c} onClick={() => setColor(c)} className={chip(color === c, optionAvailable('color', c))}>{c}</button>
                  ))}
                </div>
              </div>
            )}
            {sizes.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-stone-900">Size: <span className="font-normal text-stone-600">{size ?? 'Select'}</span></p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
                  {sizes.map((s) => (
                    <button key={s} role="radio" aria-checked={size === s} onClick={() => setSize(s)} className={chip(size === s, optionAvailable('size', s))}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-4">
              <span className="text-sm font-semibold text-stone-900">Quantity</span>
              <QuantityStepper value={Math.min(qty, maxQty)} onChange={setQty} max={maxQty} disabled={!canBuy} />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="flex-1" disabled={!canBuy} loading={add.isPending && !buying} onClick={() => void addToCart(false)} icon={<ShoppingBag className="h-5 w-5" />}>
                {available <= 0 && !needsChoice ? 'Out of stock' : 'Add to Cart'}
              </Button>
              <Button size="lg" variant="brand" className="flex-1" disabled={!canBuy} loading={buying} onClick={() => void addToCart(true)} icon={<Zap className="h-5 w-5" />}>
                Buy Now
              </Button>
              <Button size="lg" variant="outline" className="sm:w-14 sm:px-0" onClick={() => wishlist.toggle(product.id)} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}>
                <Heart className={clsx('h-5 w-5', wished && 'fill-rose-500 text-rose-500')} />
                <span className="sm:hidden">{wished ? 'Saved to wishlist' : 'Add to wishlist'}</span>
              </Button>
            </div>

            <div className="mt-6 space-y-3">
              <DeliveryCheck productAvailable={available > 0} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-stone-200 p-4">
                  <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{product.returnWindowDays > 0 ? `${product.returnWindowDays}-day returns` : 'Non-returnable'}</p>
                    <Link to="/return-policy" className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800">Return &amp; refund policy</Link>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-stone-200 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Secure checkout</p>
                    <p className="text-xs text-stone-500">UPI, cards, net banking, wallets{settings?.payment.codEnabled ? ' & COD' : ''}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="flex gap-6 border-b border-stone-200" role="tablist">
          {(['description', 'specs'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx('-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors', tab === t ? 'border-ink text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800')}>
              {t === 'description' ? 'Description' : 'Specifications'}
            </button>
          ))}
        </div>
        <div className="max-w-3xl pt-5">
          {tab === 'description' ? (
            <div className="space-y-3 text-[15px] leading-7 text-stone-700">
              {product.description.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
              {product.tags.length > 0 && (
                <p className="flex flex-wrap gap-2 pt-2">
                  {product.tags.map((t) => (
                    <Link key={t} to={`/search?q=${encodeURIComponent(t)}`} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-200">#{t}</Link>
                  ))}
                </p>
              )}
            </div>
          ) : (
            <dl className="overflow-hidden rounded-2xl border border-stone-200 text-sm">
              {[...product.specifications, { label: 'SKU', value: variant?.sku ?? product.sku }, { label: 'Category', value: product.subcategory ? `${product.category.name} › ${product.subcategory.name}` : product.category.name }].map((s, i) => (
                <div key={s.label} className={clsx('grid grid-cols-[40%_1fr] gap-4 px-4 py-3', i % 2 === 0 ? 'bg-stone-50' : 'bg-white')}>
                  <dt className="font-medium text-stone-500">{s.label}</dt>
                  <dd className="text-stone-900">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {product.frequentlyBought.length > 0 && (
        <section>
          <SectionHeading title="Frequently bought together" subtitle="Customers who bought this also bought" />
          <ProductGrid products={product.frequentlyBought} />
        </section>
      )}

      <ProductReviews product={product} />

      {product.related.length > 0 && (
        <section>
          <SectionHeading title="Related products" to={`/category/${product.category.slug}`} />
          <ProductGrid products={product.related.slice(0, 5)} />
        </section>
      )}
    </div>
  );
}
