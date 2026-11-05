import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import type { ProductCard as Product } from '@/types';

export const GRID = 'grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export function ProductGrid({ products, loading, count = 10, className = GRID, priorityCount = 4 }: { products?: Product[]; loading?: boolean; count?: number; className?: string; priorityCount?: number }) {
  return (
    <div className={className}>
      {loading || !products
        ? Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)
        : products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < priorityCount} />)}
    </div>
  );
}

// A row of products: a swipeable rail on phones (shorter pages, a natural gesture) that becomes a
// regular grid from tablet width up. The next card peeks in to show there is more to swipe.
export function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="snap-row -mx-4 gap-2.5 px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 xl:grid-cols-5" style={{ scrollPaddingInline: '1rem' }}>
      {products.map((p) => (
        <div key={p.id} className="w-[44%] shrink-0 sm:w-auto">
          <ProductCard product={p} sizes="(min-width: 1280px) 20vw, (min-width: 640px) 30vw, 44vw" />
        </div>
      ))}
    </div>
  );
}
