import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductRow } from '@/components/product/ProductRow';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useCategories } from '@/hooks/useSettings';
import { Filters } from '@/sections/listing/Filters';
import { catalogService } from '@/services/catalogService';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, PackageSearch, SlidersHorizontal, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const SORTS = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'discount', label: 'Biggest discount' },
];

const FILTER_KEYS = ['category', 'brand', 'minPrice', 'maxPrice', 'rating', 'discount', 'inStock', 'featured', 'trending', 'bestseller'];

interface ListingProps {
  title: string;
  description?: string | null;
  banner?: string | null;
  crumbs: { label: string; to?: string }[];
  fixed?: Record<string, string>; // filters imposed by the route (category slug, search text)
  lockedCategory?: boolean;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  heading?: (total: number) => ReactNode;
}

export function Listing({ title, description, banner, crumbs, fixed = {}, lockedCategory, emptyIcon, emptyTitle, heading }: ListingProps) {
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>(() => (localStorage.getItem('listing-view') === 'list' ? 'list' : 'grid'));
  const { data: categories } = useCategories();

  const set = (changes: Record<string, string | null>) => {
    // Read the live URL (not the last render) so two quick filter changes cannot overwrite each other.
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { preventScrollReset: true });
  };

  const query: Record<string, string> = { limit: '12', ...Object.fromEntries(params.entries()), ...fixed };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['products', query],
    queryFn: ({ signal }) => catalogService.products(query, signal),
    placeholderData: keepPreviousData,
  });

  const page = Number(params.get('page') ?? 1);
  const sort = params.get('sort') ?? 'popularity';
  const active = FILTER_KEYS.filter((k) => params.has(k) && !(k in fixed));
  const clearAll = () => set(Object.fromEntries(FILTER_KEYS.filter((k) => !(k in fixed)).map((k) => [k, null])));
  const chipLabel = (k: string): string => {
    const v = params.get(k)!;
    switch (k) {
      case 'category': return categories?.find((c) => c.slug === v)?.name ?? v;
      case 'brand': return v.split(',').join(', ');
      case 'minPrice': return `From ₹${v}`;
      case 'maxPrice': return `Up to ₹${v}`;
      case 'rating': return `${v}★ & above`;
      case 'discount': return `${v}%+ off`;
      case 'inStock': return 'In stock';
      case 'featured': return 'Featured';
      case 'trending': return 'Trending';
      case 'bestseller': return 'Best sellers';
      default: return v;
    }
  };

  const total = data?.meta.total ?? 0;
  const filters = <Filters params={params} set={set} facets={data?.meta.facets} categories={categories} lockedCategory={lockedCategory} />;

  return (
    <div className="container-page py-5 lg:py-8">
      <Breadcrumbs items={crumbs} />

      {banner && (
        <div className="relative mb-6 h-36 overflow-hidden rounded-3xl bg-stone-900 sm:h-48">
          <Img src={banner} alt="" eager className="h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-stone-950/70 to-transparent px-6 sm:px-10">
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>
            {description && <p className="mt-1.5 max-w-lg text-sm text-stone-200 sm:text-base">{description}</p>}
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          {!banner && <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{heading ? heading(total) : title}</h1>}
          <p className={clsx('text-sm text-stone-500', !banner && 'mt-1')} aria-live="polite">
            {isLoading ? 'Loading products…' : `${total} product${total === 1 ? '' : 's'}${!banner && description ? ` · ${description}` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setSheet(true)} icon={<SlidersHorizontal className="h-4 w-4" />}>
            Filters{active.length > 0 && ` (${active.length})`}
          </Button>
          <label className="sr-only" htmlFor="sort">Sort by</label>
          <select id="sort" value={sort} onChange={(e) => set({ sort: e.target.value === 'popularity' ? null : e.target.value })} className="field h-9 w-auto !rounded-lg !py-0 pr-8 text-sm">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div className="hidden overflow-hidden rounded-lg border border-stone-300 bg-white sm:flex" role="group" aria-label="View">
            {(['grid', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v);
                  localStorage.setItem('listing-view', v);
                }}
                aria-pressed={view === v}
                aria-label={`${v} view`}
                className={clsx('flex h-9 w-9 items-center justify-center transition-colors', view === v ? 'bg-ink text-white' : 'text-stone-500 hover:bg-stone-100')}
              >
                {v === 'grid' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {active.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {active.map((k) => (
            <button key={k} onClick={() => set({ [k]: null })} className="inline-flex items-center gap-1.5 rounded-full bg-stone-200/70 py-1 pl-3 pr-2 text-xs font-medium text-stone-800 hover:bg-stone-200" aria-label={`Remove filter ${chipLabel(k)}`}>
              {chipLabel(k)} <X className="h-3.5 w-3.5" />
            </button>
          ))}
          <button onClick={clearAll} className="text-xs font-semibold text-brand-700 hover:underline">Clear all</button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="card sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto p-5">{filters}</div>
        </aside>

        <div className={clsx('min-w-0 transition-opacity', isFetching && !isLoading && 'opacity-60')}>
          {error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : isLoading ? (
            <ProductGrid loading count={8} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" />
          ) : total === 0 ? (
            <EmptyState
              icon={emptyIcon ?? <PackageSearch />}
              title={emptyTitle ?? 'No products found'}
              message={active.length > 0 ? 'Try changing or clearing your filters.' : 'Try a different search or browse all products.'}
              action={active.length > 0 ? <Button variant="outline" onClick={clearAll}>Clear filters</Button> : <Link to="/products" className="text-sm font-semibold text-brand-700 hover:underline">Browse all products</Link>}
            />
          ) : (
            <>
              {view === 'grid' ? (
                <ProductGrid products={data!.data} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" />
              ) : (
                <div className="space-y-3">
                  {data!.data.map((p) => (
                    <ProductRow key={p.id} product={p} />
                  ))}
                </div>
              )}
              <div className="mt-8">
                <Pagination
                  page={page}
                  pages={data!.meta.pages}
                  onChange={(p) => {
                    set({ page: p === 1 ? null : String(p) });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={sheet} onClose={() => setSheet(false)} title="Filters" footer={<><Button variant="outline" size="sm" onClick={clearAll}>Clear all</Button><Button size="sm" onClick={() => setSheet(false)}>Show {total} result{total === 1 ? '' : 's'}</Button></>}>
        {filters}
      </Modal>
    </div>
  );
}
