import { ApiError, errorMessage } from '@/api/client';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { Price } from '@/components/ui/Price';
import { Stars } from '@/components/ui/Rating';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { toast } from '@/store/toast';
import type { ProductCard as Product } from '@/types';
import { Heart, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const { add } = useCart();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const outOfStock = product.stock <= 0;
  const wished = wishlist.has(product.id);
  const href = `/product/${product.slug}`;

  const addToCart = () => {
    add.mutate(
      { productId: product.id },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'VARIANT_REQUIRED') navigate(href);
          else toast.error(errorMessage(err));
        },
      },
    );
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white transition-shadow duration-300 hover:shadow-lift">
      <Link to={href} className="relative block aspect-square overflow-hidden bg-stone-100" aria-label={product.name}>
        <Img
          src={product.image}
          alt={product.name}
          eager={priority}
          className={clsx('h-full w-full object-cover transition duration-500 group-hover:scale-105', outOfStock && 'opacity-60 grayscale-[30%]', product.hoverImage && 'group-hover:opacity-0')}
        />
        {product.hoverImage && (
          <img src={product.hoverImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {product.discountPercent > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">-{product.discountPercent}%</span>}
          {product.isBestSeller && <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-semibold text-white">Best seller</span>}
        </div>
        {outOfStock && <span className="absolute inset-x-0 bottom-0 bg-stone-900/75 py-1.5 text-center text-xs font-semibold text-white">Out of stock</span>}
      </Link>

      <button
        type="button"
        onClick={() => wishlist.toggle(product.id)}
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={wished}
        className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-sm backdrop-blur transition hover:scale-110 hover:text-rose-600"
      >
        <Heart className={clsx('h-[18px] w-[18px] transition-colors', wished && 'fill-rose-500 text-rose-500')} />
      </button>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.brand && <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{product.brand}</p>}
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-stone-800">
          <Link to={href} className="hover:text-brand-700">
            {product.name}
          </Link>
        </h3>
        <div className="mt-1.5 flex h-4 items-center gap-1.5">
          {product.ratingCount > 0 ? (
            <>
              <Stars value={product.ratingAvg} />
              <span className="text-xs text-stone-500">({product.ratingCount})</span>
            </>
          ) : (
            <span className="text-xs text-stone-400">No reviews yet</span>
          )}
        </div>
        <Price price={product.sellingPrice} mrp={product.price} className="mt-2" />
        <div className="mt-3 flex-1" />
        {product.hasVariants && !outOfStock ? (
          <Link to={href} className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-stone-300 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-50">
            Select options
          </Link>
        ) : (
          <Button size="sm" variant={outOfStock ? 'soft' : 'primary'} block disabled={outOfStock} loading={add.isPending} onClick={addToCart} icon={<ShoppingBag className="h-4 w-4" />}>
            {outOfStock ? 'Out of stock' : 'Add to cart'}
          </Button>
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
