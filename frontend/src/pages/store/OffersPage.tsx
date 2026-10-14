import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { SectionHeading } from '@/components/common/SectionHeading';
import { OfferCard } from '@/components/offers/OfferCard';
import { ProductGrid } from '@/components/product/ProductGrid';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { useSeo } from '@/hooks/useSeo';
import { catalogService } from '@/services/catalogService';
import { useQuery } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

export function OffersPage() {
  useSeo({ title: 'Offers & Deals', description: 'Active coupons, flash deals and category offers.' });
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['offers'], queryFn: () => catalogService.offers() });

  return (
    <div className="container-page space-y-12 py-5 lg:py-8">
      <div>
        <Breadcrumbs items={[{ label: 'Offers' }]} />
        <section className="rounded-3xl bg-gradient-to-br from-rose-600 to-rose-700 px-6 py-10 text-white sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-100">Offers &amp; deals</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Save more on every order</h1>
          <p className="mt-2 max-w-xl text-rose-50">Copy a coupon code and apply it in your cart. One coupon per order.</p>
        </section>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
      ) : error || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <section>
            <SectionHeading title="Coupon offers" subtitle="Tap a code to copy it" />
            {data.coupons.length === 0 ? (
              <div className="card"><EmptyState icon={<Tag />} title="No active coupons right now" message="Check back soon — new offers are added regularly." /></div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.coupons.map((o) => <OfferCard key={o.id} offer={o} />)}</div>
            )}
          </section>

          {data.categoryOffers.length > 0 && (
            <section>
              <SectionHeading title="Category offers" subtitle="Biggest discounts in each category" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                {data.categoryOffers.map((c) => (
                  <Link key={c.slug} to={`/category/${c.slug}?sort=discount`} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-stone-900">
                    <Img src={c.imageUrl} alt="" className="h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-stone-950/90 to-transparent p-4">
                      <p className="text-xs font-semibold text-stone-300">{c.name}</p>
                      <p className="font-display text-lg font-extrabold leading-tight text-white">Up to {c.maxDiscount}% off</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.deals.length > 0 && (
            <section>
              <SectionHeading title="Flash deals" subtitle="20% off or more, while stocks last" to="/products?discount=20&sort=discount" />
              <ProductGrid products={data.deals.slice(0, 10)} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
