import { ApiError, errorMessage } from '@/api/client';
import { clsx } from '@/components/ui';
import { Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { toast } from '@/store/toast';
import type { ProductCard as Product } from '@/types';
import { flyToCart } from '@/utils/flyToCart';
import { money } from '@/utils/format';
import { Heart, Loader2, Plus, Star } from 'lucide-react';
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// The storefront's product tile. Built for a two-column phone grid: a fixed-ratio image, a
// two-line name, one line each for rating and price, and a full-width action — so every card in a
// row is the same height and nothing moves while images load.
export function ProductCard({ product, priority, sizes }: { product: Product; priority?: boolean; sizes?: string }) {
  const { add } = useCart();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const media = useRef<HTMLAnchorElement>(null);
  const outOfStock = product.stock <= 0;
  const wished = wishlist.has(product.id);
  const href = `/product/${product.slug}`;

  const addToCart = () => {
    add.mutate(
      { productId: product.id },
      {
        onSuccess: () => flyToCart(media.current),
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'VARIANT_REQUIRED') navigate(href);
          else toast.error(errorMessage(err));
        },
      },
    );
  };

  const action = 'pressable relative z-10 mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition-colors';

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80 transition-shadow duration-base hover:shadow-lift">
      <Link ref={media} to={href} className="relative block aspect-[4/5] overflow-hidden bg-stone-100" aria-hidden="true" tabIndex={-1}>
        <Img src={product.image} alt="" eager={priority} sizes={sizes} className={clsx('h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]', outOfStock && 'grayscale-[35%]')} />
        {product.hoverImage && (
          <img src={product.hoverImage} alt="" loading="lazy" decoding="async" className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 lg:block" />
        )}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {product.discountPercent > 0 && <span className="rounded-md bg-accent-300 px-1.5 py-0.5 text-[11px] font-bold leading-4 text-accent-900">{product.discountPercent}% OFF</span>}
          {product.isBestSeller && <span className="rounded-md bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-stone-800 shadow-sm">Bestseller</span>}
        </div>
        {outOfStock && <span className="absolute inset-0 flex items-center justify-center bg-white/55 text-xs font-bold uppercase tracking-wide text-stone-800">Sold out</span>}
      </Link>

      {/* 44px touch target around a smaller visual button. */}
      <button
        type="button"
        onClick={() => wishlist.toggle(product.id)}
        aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        aria-pressed={wished}
        className="absolute right-0.5 top-0.5 z-10 flex h-11 w-11 items-center justify-center"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-stone-600 shadow-sm transition-colors group-hover:text-stone-900">
          <Heart key={String(wished)} className={clsx('h-4 w-4', wished && 'animate-pop fill-rose-500 text-rose-500')} />
        </span>
      </button>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
        <p className="h-4 truncate text-[11px] font-semibold uppercase tracking-wider text-stone-500">{product.brand ?? product.category.name}</p>
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] font-sans text-[13px] font-medium leading-5 tracking-normal text-stone-800 sm:text-sm">
          <Link to={href} className="after:absolute after:inset-0 after:content-[''] hover:text-brand-700">{product.name}</Link>
        </h3>
        <p className="mt-1 flex h-4 items-center gap-1 text-xs text-stone-500">
          {product.ratingCount > 0 && (
            <>
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              <span className="font-semibold text-stone-700">{product.ratingAvg.toFixed(1)}</span>
              <span aria-hidden>({product.ratingCount})</span>
              <span className="sr-only">out of 5, {product.ratingCount} reviews</span>
            </>
          )}
        </p>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[15px] font-bold text-stone-900 sm:text-base">{money(product.sellingPrice)}</span>
          {product.price > product.sellingPrice && (
            <span className="text-xs text-stone-500 line-through">
              <span className="sr-only">Original price </span>
              {money(product.price)}
              <span className="sr-only">, {product.discountPercent}% off</span>
            </span>
          )}
        </p>
        <div className="flex-1" />
        {outOfStock ? (
          <Link to={href} className={clsx(action, 'bg-stone-100 text-stone-600')}>Sold out · View</Link>
        ) : product.hasVariants ? (
          <Link to={href} className={clsx(action, 'border border-stone-300 text-stone-800 hover:bg-stone-50')}>Choose options</Link>
        ) : (
          <button type="button" onClick={addToCart} disabled={add.isPending} aria-busy={add.isPending || undefined} className={clsx(action, 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-70')}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            Add to cart
          </button>
        )}
      </div>
    </article>
  );
}

// Same box model as the card, so the grid does not move when products replace skeletons.
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80">
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="p-2.5 sm:p-3.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-3.5 h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
