import { ProductGrid } from '@/components/product/ProductGrid';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useSeo } from '@/hooks/useSeo';
import { Listing } from '@/sections/listing/Listing';
import { catalogService } from '@/services/catalogService';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const { data: category, isLoading, error, refetch } = useQuery({ queryKey: ['category', slug], queryFn: () => catalogService.category(slug) });
  useSeo({ title: category?.name, description: category?.description ?? undefined, image: category?.imageUrl });
  if (isLoading) return <div className="container-page py-8"><Skeleton className="h-48 w-full rounded-3xl" /><div className="mt-8"><ProductGrid loading count={8} /></div></div>;
  if (error || !category) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return <Listing key={slug} title={category.name} description={category.description} banner={category.bannerUrl ?? category.imageUrl} crumbs={[{ label: 'Products', to: '/products' }, { label: category.name }]} fixed={{ category: slug }} lockedCategory />;
}
