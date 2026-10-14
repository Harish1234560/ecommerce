import { SectionHeading } from '@/components/common/SectionHeading';
import { OfferCard } from '@/components/offers/OfferCard';
import { ProductGrid } from '@/components/product/ProductGrid';
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
import { motion } from 'framer-motion';
import { ArrowRight, Headphones, Quote, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

function HomeSkeleton() {
  return (
    <div className="container-page space-y-10 py-6">
      <Skeleton className="h-[420px] w-full rounded-3xl lg:h-[500px]" />
      <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-2xl" />
        ))}
      </div>
      <ProductGrid loading count={5} />
    </div>
  );
}

export default function HomePage() {
  const { data: settings } = useSettings();
  useSeo({ description: `${settings?.store.tagline ?? 'Online store'}. Shop fashion, electronics, home, beauty and more with fast delivery and easy returns.` });
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
          <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-6">
            {data.categories.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/category/${c.slug}`} className="group block text-center">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200/70 transition group-hover:shadow-card group-hover:ring-stone-300">
                    <Img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <p className="mt-2.5 text-sm font-semibold text-stone-800 group-hover:text-brand-700">{c.name}</p>
                  <p className="text-xs text-stone-500">{c.productCount} product{c.productCount === 1 ? '' : 's'}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      ),
    featured: (title, subtitle) =>
      data.featured.length > 0 && (
        <section>
          <SectionHeading title={title} subtitle={subtitle} to="/products?featured=true" />
          <ProductGrid products={data.featured} />
        </section>
      ),
    trending: (title, subtitle) =>
      data.trending.length > 0 && (
        <section>
          <SectionHeading title={title} subtitle={subtitle} to="/products?trending=true" />
          <ProductGrid products={data.trending} />
        </section>
      ),
    bestsellers: (title, subtitle) =>
      data.bestSellers.length > 0 && (
        <section>
          <SectionHeading title={title} subtitle={subtitle} to="/products?sort=popularity" />
          <ProductGrid products={data.bestSellers} />
        </section>
      ),
    offers: (title, subtitle) =>
      data.offers.length > 0 && (
        <section>
          <SectionHeading title={title} subtitle={subtitle} to="/offers" linkLabel="All offers" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.offers.slice(0, 3).map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        </section>
      ),
    promo: () =>
      data.banners.promo.length > 0 && (
        <section className={clsx('grid gap-4', data.banners.promo.length > 1 && 'md:grid-cols-2')}>
          {data.banners.promo.map((b) => (
            <Link key={b.id} to={b.linkUrl ?? '/offers'} className="group relative block h-52 overflow-hidden rounded-3xl bg-stone-900 sm:h-64">
              <Img src={b.imageUrl} alt="" className="h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-stone-950/70 to-transparent p-7 sm:p-10">
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
          <div className="grid gap-4 md:grid-cols-3">
            {data.testimonials.map((t) => (
              <figure key={t.id} className="card flex flex-col p-6">
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
    <div className="container-page space-y-12 py-4 sm:space-y-16 sm:py-6">
      <Hero banners={data.banners.hero} />

      <section className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl border border-stone-200/80 bg-white p-5 lg:grid-cols-4 lg:p-6" aria-label="Why shop with us">
        {perks.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900">{title}</p>
              <p className="truncate text-xs text-stone-500">{text}</p>
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
