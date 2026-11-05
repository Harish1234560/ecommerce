import { clsx } from '@/components/ui';
import type { Banner } from '@/types';
import { responsiveImage } from '@/utils/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function Hero({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;
  // Rotation waits for the visitor's first interaction: the first banner stays put while the page
  // loads, so the largest paint is the first one rather than a later slide.
  const [engaged, setEngaged] = useState(false);
  useEffect(() => {
    const start = () => setEngaged(true);
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, start));
  }, []);
  useEffect(() => {
    if (count <= 1 || paused || !engaged) return;
    const t = setInterval(() => {
      // Do not rotate in a background tab.
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, 6000);
    return () => clearInterval(t);
  }, [count, paused, engaged]);
  if (count === 0) return null;
  const banner = banners[index % count]!;
  const go = (d: number) => setIndex((i) => (i + d + count) % count);
  const image = responsiveImage(banner.imageUrl, 'banner');

  return (
    <section
      className="relative isolate overflow-hidden rounded-3xl bg-stone-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      aria-roledescription="carousel"
      aria-label="Promotions"
    >
      {/* Short enough on phones that the first products are visible without scrolling far. */}
      <motion.div
        className="relative h-[300px] touch-pan-y sm:h-[400px] lg:h-[480px]"
        drag={count > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        dragSnapToOrigin
        onDragEnd={(_e, info) => {
          if (info.offset.x < -50) go(1);
          else if (info.offset.x > 50) go(-1);
        }}
      >
        <AnimatePresence initial={false}>
          <motion.div key={banner.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-0">
            <img src={image.src} srcSet={image.srcSet} sizes="(min-width: 1280px) 1216px, 100vw" alt="" draggable={false} className="h-full w-full object-cover" fetchPriority={index === 0 ? 'high' : undefined} decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/40 to-transparent sm:bg-gradient-to-r sm:from-stone-950/85 sm:via-stone-950/45" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 flex items-end sm:items-center">
          <motion.div key={banner.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="max-w-xl p-5 pb-11 sm:p-12 lg:p-16">
            <h1 className="text-balance text-display text-white sm:text-5xl sm:leading-[1.08] lg:text-display-lg">{banner.title}</h1>
            {banner.subtitle && <p className="mt-2.5 line-clamp-2 max-w-md text-sm text-stone-200 sm:mt-4 sm:text-lg">{banner.subtitle}</p>}
            {banner.ctaText && banner.linkUrl && (
              <Link to={banner.linkUrl} className="pressable mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-ink transition-colors hover:bg-brand-100 sm:mt-7 sm:h-12 sm:px-7">
                {banner.ctaText} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </motion.div>
        </div>
      </motion.div>
      {count > 1 && (
        <>
          <div className="absolute bottom-1 left-3 flex sm:bottom-3 sm:left-10 lg:left-14">
            {banners.map((b, i) => (
              <button key={b.id} onClick={() => setIndex(i)} aria-label={`Show slide ${i + 1}`} aria-current={i === index} className="flex h-11 min-w-[28px] items-center justify-center">
                <span className={clsx('block h-1.5 rounded-full transition-[width,background-color] duration-base', i === index ? 'w-7 bg-white' : 'w-1.5 bg-white/50')} />
              </button>
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
