import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import type { ProductCard as Product } from '@/types';
import { motion } from 'framer-motion';

export const GRID = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export function ProductGrid({ products, loading, count = 10, className = GRID }: { products?: Product[]; loading?: boolean; count?: number; className?: string }) {
  return (
    <div className={className}>
      {loading || !products
        ? Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)
        : products.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}>
              <ProductCard product={p} priority={i < 4} />
            </motion.div>
          ))}
    </div>
  );
}
