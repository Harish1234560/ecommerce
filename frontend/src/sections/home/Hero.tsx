import { clsx } from '@/components/ui';
import type { Banner } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function Hero({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;
  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count, paused]);
  if (count === 0) return null;
  const banner = banners[index % count]!;
  const go = (d: number) => setIndex((i) => (i + d + count) % count);

  return (
    <section
      className="relative isolate overflow-hidden rounded-3xl bg-stone-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Promotions"
    >
      <div className="relative h-[420px] sm:h-[440px] lg:h-[500px]">
        <AnimatePresence initial={false}>
          <motion.div key={banner.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-0">
            <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" fetchPriority="high" />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/40 to-transparent sm:bg-gradient-to-r sm:from-stone-950/85 sm:via-stone-950/45" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 flex items-end sm:items-center">
          <motion.div key={banner.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="max-w-xl p-7 pb-14 sm:p-12 lg:p-16">
            <h1 className="text-balance text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl lg:text-6xl">{banner.title}</h1>
            {banner.subtitle && <p className="mt-4 max-w-md text-base text-stone-200 sm:text-lg">{banner.subtitle}</p>}
            {banner.ctaText && banner.linkUrl && (
              <Link to={banner.linkUrl} className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-ink transition hover:bg-brand-100">
                {banner.ctaText} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </motion.div>
        </div>
      </div>
      {count > 1 && (
        <>
          <div className="absolute bottom-5 left-7 flex gap-1.5 sm:left-12 lg:left-16">
            {banners.map((b, i) => (
              <button key={b.id} onClick={() => setIndex(i)} aria-label={`Show slide ${i + 1}`} aria-current={i === index} className={clsx('h-1.5 rounded-full transition-all', i === index ? 'w-8 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80')} />
            ))}
          </div>
          <div className="absolute bottom-4 right-5 hidden gap-2 sm:flex">
            <button onClick={() => go(-1)} aria-label="Previous slide" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => go(1)} aria-label="Next slide" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
