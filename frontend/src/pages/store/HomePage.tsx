import { SectionHeading } from '@/components/common/SectionHeading';
import { OfferCard } from '@/components/offers/OfferCard';
import { ProductGrid, ProductRail } from '@/components/product/ProductGrid';
import { clsx } from '@/components/ui';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { Stars } from '@/components/ui/Rating';
import { useSeo } from '@/hooks/useSeo';
import { useSettings } from '@/hooks/useSettings';
import { Hero } from '@/sections/home/Hero';
import { Newsletter } from '@/sections/home/Newsletter';
import { catalogService } from '@/services/catalogService';
import { money } from '@/utils/format';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Headphones, Quote, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

function HomeSkeleton() {
  return (
    <div className="container-page space-y-10 py-6">
      <Skeleton className="h-[300px] w-full rounded-3xl sm:h-[400px] lg:h-[480px]" />
      <div className="flex gap-3 overflow-hidden md:grid md:grid-cols-6 md:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-[22%] shrink-0 rounded-2xl md:w-auto" />
        ))}
      </div>
      <ProductGrid loading count={4} />
    </div>
  );
}

export default function HomePage() {
  const { data: settings } = useSettings();
  useSeo({
    description: `${settings?.store.tagline ?? 'Online store'}. Fast delivery, secure payments and easy returns.`,
    image: settings?.store.logoUrl || null,
    jsonLd: settings
      ? [
          { '@context': 'https://schema.org', '@type': 'Organization', name: settings.store.name, url: window.location.origin, ...(settings.store.logoUrl ? { logo: new URL(settings.store.logoUrl, window.location.origin).href } : {}) },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: settings.store.name,
            url: window.location.origin,
            potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${window.location.origin}/search?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
          },
        ]
      : null,
  });
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['home'], queryFn: () => catalogService.home() });

  if (isLoading) return <HomeSkeleton />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const threshold = settings?.shipping.freeShippingThreshold ?? 0;
  const perks = [
    { icon: Truck, title: threshold > 0 ? 'Free delivery' : 'Fast delivery', text: threshold > 0 ? `On orders above ${money(threshold)}` : 'Across India' },
    { icon: RefreshCw, title: `${settings?.policies.returnWindowDays ?? 7}-day returns`, text: 'Easy, no-hassle returns' },
    { icon: ShieldCheck, title: 'Secure payments', text: 'UPI, cards, net banking, COD' },
    { icon: Headphones, title: 'Real support', text: settings?.store.businessHours ?? 'We are here to help' },
  ];

  const blocks: Record<string, (title: string, subtitle: string | null) => ReactNode> = {
    categories: (title, subtitle) =>
      data.categories.length > 0 && (
        <section>
          <SectionHeading title={title} subtitle={subtitle} to="/products" />
          {/* Phones: one swipeable row. Tablet and up: a grid. */}
          <div className="snap-row -mx-4 gap-3 px-4 md:mx-0 md:grid md:grid-cols-6 md:gap-4 md:overflow-visible md:px-0" style={{ scrollPaddingInline: '1rem' }}>
            {data.categories.map((c) => (
              <Link key={c.id} to={`/category/${c.slug}`} className="group block w-[22%] min-w-[76px] shrink-0 text-center md:w-auto">
                <div className="aspect-square overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200/70 transition-shadow group-hover:shadow-card">
                  <Img src={c.imageUrl} alt="" sizes="(min-width: 768px) 16vw, 96px" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <p className="mt-2 truncate text-[13px] font-semibold text-stone-800 group-hover:text-brand-700 md:text-sm">{c.name}</p>
                <p className="hidden text-xs text-stone-500 md:block">{c.productCount} product{c.productCount === 1 ? '' : 's'}</p>
              </Link>
            ))}
          </div>
        </section>
      ),
    featured: (title, subtitle) =>
      data.featured.length > 0 && (
        <section>
          <SectionHeading title={title} subtitle={subtitle} to="/products?featured=true" />
          <ProductRail products={data.featured} />
        </section>
      ),
    trending: (title, subtitle) =>
      data.trending.length > 0 && (
        <section>
          <SectionHeading title={title} subtitle={subtitle} to="/products?trending=true" />
          <ProductRail products={data.trending} />
        </section>
      ),
    bestsellers: (title, subtitle) =>
      data.bestSellers.length > 0 && (
        <section>
          <SectionHeading title={title} subtitle={subtitle} to="/products?sort=popularity" />
          <ProductRail products={data.bestSellers} />
        </section>
      ),
    offers: (title, subtitle) =>
      data.offers.length > 0 && (
        <section>
          <SectionHeading title={title} subtitle={subtitle} to="/offers" linkLabel="All offers" />
          <div className="snap-row -mx-4 gap-3 px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3" style={{ scrollPaddingInline: '1rem' }}>
            {data.offers.slice(0, 3).map((o) => (
              <div key={o.id} className="w-[82%] shrink-0 sm:w-auto"><OfferCard offer={o} /></div>
            ))}
          </div>
        </section>
      ),
    promo: () =>
      data.banners.promo.length > 0 && (
        <section className={clsx('grid gap-4', data.banners.promo.length > 1 && 'md:grid-cols-2')}>
          {data.banners.promo.map((b) => (
            <Link key={b.id} to={b.linkUrl ?? '/offers'} className="group relative block h-44 overflow-hidden rounded-3xl bg-stone-900 sm:h-64">
              <Img src={b.imageUrl} alt="" preset="banner" sizes="(min-width: 768px) 50vw, 100vw" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-stone-950/80 via-stone-950/50 to-stone-950/20 p-6 sm:p-10">
                <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{b.title}</h2>
                {b.subtitle && <p className="mt-1.5 text-sm text-stone-200 sm:text-base">{b.subtitle}</p>}
                {b.ctaText && (
                  <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-ink">
                    {b.ctaText} <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            </Link>
          ))}
        </section>
      ),
    testimonials: (title, subtitle) =>
      data.testimonials.length > 0 && (
        <section>
          <SectionHeading title={title} subtitle={subtitle} />
          <div className="snap-row -mx-4 gap-3 px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0" style={{ scrollPaddingInline: '1rem' }}>
            {data.testimonials.map((t) => (
              <figure key={t.id} className="card flex w-[82%] shrink-0 flex-col p-5 md:w-auto md:p-6">
                <Quote className="h-7 w-7 text-brand-200" />
                <blockquote className="mt-3 flex-1 text-[15px] leading-7 text-stone-700">{t.text}</blockquote>
                <figcaption className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{t.name}</p>
                    {t.location && <p className="text-xs text-stone-500">{t.location}</p>}
                  </div>
                  <Stars value={t.rating} size="md" />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ),
    newsletter: (title, subtitle) => <Newsletter title={title} subtitle={subtitle} />,
  };

  return (
    <div className="container-page space-y-9 py-3 sm:space-y-16 sm:py-6">
      <Hero banners={data.banners.hero} />

      <section className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-2xl border border-stone-200/80 bg-white p-4 lg:grid-cols-4 lg:p-6" aria-label="Why shop with us">
        {perks.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900">{title}</p>
              <p className="line-clamp-2 text-xs leading-4 text-stone-500">{text}</p>
            </div>
          </div>
        ))}
      </section>

      {data.sections.map((s) => {
        const block = blocks[s.key]?.(s.title, s.subtitle);
        return block ? <div key={s.key}>{block}</div> : null;
      })}
    </div>
  );
}
