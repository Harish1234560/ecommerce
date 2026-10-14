import { useSeo } from '@/hooks/useSeo';
import { Listing } from '@/sections/listing/Listing';
import { useSearchParams } from 'react-router-dom';

export function ProductsPage() {
  const [params] = useSearchParams();
  const title = params.get('featured') ? 'Featured Products' : params.get('trending') ? 'Trending Now' : params.get('bestseller') ? 'Best Sellers' : 'All Products';
  useSeo({ title, description: 'Browse our full catalogue. Filter by category, price, rating, brand and discount.' });
  return <Listing title={title} crumbs={[{ label: 'Products' }]} />;
}
