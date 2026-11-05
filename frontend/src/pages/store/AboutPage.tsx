import { SectionHeading } from '@/components/common/SectionHeading';
import { buttonClass } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useContent } from '@/hooks/useContent';
import { useSeo } from '@/hooks/useSeo';
import { useSettings } from '@/hooks/useSettings';
import type { AboutData } from '@/types';
import { Award, Compass, Eye, HeartHandshake, MapPin, Tag, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AboutPage() {
  const { data: settings } = useSettings();
  const { data, isLoading, error, refetch } = useContent<AboutData>('about');
  const d = data?.data ?? {};
  useSeo({ title: 'About Us', description: d.heroSubtitle ?? d.story?.slice(0, 160) });

  if (isLoading) return <div className="container-page space-y-6 py-8"><Skeleton className="h-64 w-full rounded-3xl" /><Skeleton className="h-40 w-full" /></div>;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const icons = [Award, Tag, Compass, HeartHandshake];

  return (
    <div className="container-page space-y-14 py-5 lg:py-8">
      <section className="rounded-3xl bg-brand-900 px-6 py-14 text-center sm:px-12 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-300">About {settings?.store.name}</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-extrabold text-white sm:text-5xl">{d.heroTitle ?? data?.title}</h1>
        {d.heroSubtitle && <p className="mx-auto mt-4 max-w-2xl text-base text-brand-100/85 sm:text-lg">{d.heroSubtitle}</p>}
      </section>

      {d.stats && d.stats.length > 0 && (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Shop statistics">
          {d.stats.map((s) => (
            <div key={s.label} className="card p-6 text-center">
              <p className="font-display text-3xl font-extrabold text-brand-700">{s.value}</p>
              <p className="mt-1 text-sm text-stone-500">{s.label}</p>
            </div>
          ))}
        </section>
      )}

      {d.story && (
        <section className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-stone-900">Our story</h2>
          <div className="mt-4 space-y-4 text-[15px] leading-7 text-stone-600">{d.story.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div>
        </section>
      )}

      {(d.mission || d.vision) && (
        <section className="grid gap-5 md:grid-cols-2">
          {d.mission && (
            <div className="card p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Target className="h-5 w-5" /></span>
              <h2 className="mt-4 text-xl font-bold text-stone-900">Our mission</h2>
              <p className="mt-2 text-[15px] leading-7 text-stone-600">{d.mission}</p>
            </div>
          )}
          {d.vision && (
            <div className="card p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Eye className="h-5 w-5" /></span>
              <h2 className="mt-4 text-xl font-bold text-stone-900">Our vision</h2>
              <p className="mt-2 text-[15px] leading-7 text-stone-600">{d.vision}</p>
            </div>
          )}
        </section>
      )}

      {d.whyChooseUs && d.whyChooseUs.length > 0 && (
        <section>
          <SectionHeading title="Why choose us" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {d.whyChooseUs.map((w, i) => {
              const Icon = icons[i % icons.length]!;
              return (
                <div key={w.title} className="card p-6">
                  <Icon className="h-6 w-6 text-brand-600" />
                  <h3 className="mt-3 text-base font-bold text-stone-900">{w.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-stone-600">{w.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(d.qualityPromise || d.customerFirst) && (
        <section className="grid gap-5 md:grid-cols-2">
          {d.qualityPromise && (
            <div className="rounded-2xl bg-stone-900 p-7 text-white">
              <h2 className="text-xl font-bold">Our quality promise</h2>
              <p className="mt-2 text-[15px] leading-7 text-stone-300">{d.qualityPromise}</p>
            </div>
          )}
          {d.customerFirst && (
            <div className="rounded-2xl bg-brand-100 p-7">
              <h2 className="text-xl font-bold text-brand-950">Customers come first</h2>
              <p className="mt-2 text-[15px] leading-7 text-brand-900">{d.customerFirst}</p>
            </div>
          )}
        </section>
      )}

      {(d.team?.length || d.businessInfo) && (
        <section className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">The people behind the shop</h2>
            {d.businessInfo && <p className="mt-3 text-[15px] leading-7 text-stone-600">{d.businessInfo}</p>}
            {settings?.store.address && <p className="mt-3 flex items-start gap-2 text-sm text-stone-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" /> {settings.store.address}</p>}
            {settings?.store.gstin && <p className="mt-1 text-sm text-stone-600">GSTIN: {settings.store.gstin}</p>}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {d.team?.map((m) => (
              <li key={m.name} className="card flex items-center gap-3 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 font-display font-bold text-stone-700">{m.name.charAt(0)}</span>
                <span><span className="block text-sm font-semibold text-stone-900">{m.name}</span><span className="block text-xs text-stone-500">{m.role}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl border border-stone-200 bg-white px-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-stone-900">Questions? We are happy to help.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">Reach out about an order, a product, or anything else.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/contact" className={buttonClass('primary', 'lg')}>Contact us</Link>
          <Link to="/products" className={buttonClass('outline', 'lg')}>Browse products</Link>
        </div>
      </section>
    </div>
  );
}
