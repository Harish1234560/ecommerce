import { EmptyState } from '@/components/ui/Feedback';
import { useSeo } from '@/hooks/useSeo';
import { Listing } from '@/sections/listing/Listing';
import { SearchX } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  useSeo({ title: q ? `Search: ${q}` : 'Search', noindex: true });
  if (!q) {
    return (
      <div className="container-page py-10">
        <EmptyState icon={<SearchX />} title="Search the store" message="Type a product, brand or category in the search bar above." action={<Link to="/products" className="text-sm font-semibold text-brand-700 hover:underline">Browse all products</Link>} />
      </div>
    );
  }
  return (
    <Listing
      key={q}
      title={`Search results for "${q}"`}
      heading={() => <>Search results for <span className="text-brand-700">“{q}”</span></>}
      crumbs={[{ label: 'Search' }]}
      fixed={{ q }}
      emptyIcon={<SearchX />}
      emptyTitle={`No results for "${q}"`}
    />
  );
}
