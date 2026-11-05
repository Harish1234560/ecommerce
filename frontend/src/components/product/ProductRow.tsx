import { Button } from '@/components/ui/Button';
import { Img } from '@/components/ui/Img';
import { Price } from '@/components/ui/Price';
import { Stars } from '@/components/ui/Rating';
import { useCart } from '@/hooks/useCart';
import type { ProductCard as Product } from '@/types';
import { Link } from 'react-router-dom';

export function ProductRow({ product }: { product: Product }) {
  const { add } = useCart();
  const out = product.stock <= 0;
  return (
    <article className="card flex gap-4 p-3 transition-shadow hover:shadow-card sm:p-4">
      <Link to={`/product/${product.slug}`} className="relative block h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-36 sm:w-36">
        <Img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        {product.discountPercent > 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">-{product.discountPercent}%</span>}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        {product.brand && <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{product.brand}</p>}
        <h3 className="line-clamp-2 text-sm font-medium text-stone-800 sm:text-base">
          <Link to={`/product/${product.slug}`} className="hover:text-brand-700">{product.name}</Link>
        </h3>
        <div className="mt-1 flex items-center gap-1.5">
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
        <div className="mt-auto flex items-center gap-3 pt-2">
          {out ? (
            <span className="text-sm font-semibold text-rose-600">Out of stock</span>
          ) : product.hasVariants ? (
            <Link to={`/product/${product.slug}`} className="inline-flex h-9 items-center rounded-lg border border-stone-300 px-3 text-sm font-semibold text-stone-800 hover:bg-stone-50">Select options</Link>
          ) : (
            <Button size="sm" loading={add.isPending} onClick={() => add.mutate({ productId: product.id })}>Add to cart</Button>
          )}
        </div>
      </div>
    </article>
  );
}
