import { clsx } from '@/components/ui';
import { IconButton } from '@/components/ui/Button';
import { Img } from '@/components/ui/Img';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { ProductDetail } from '@/types';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';

type Images = ProductDetail['images'];

// Full-screen viewer. Images scroll sideways with snap; pinch-zoom is the browser's own.
function Lightbox({ images, name, start, onClose }: { images: Images; name: string; start: number; onClose: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);
  useEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = el.clientWidth * start;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [start, onClose]);
  return createPortal(
    <div className="fixed inset-0 z-overlay flex animate-fade-in flex-col bg-stone-950" role="dialog" aria-modal="true" aria-label={`${name} images`}>
      <div className="flex items-center justify-between px-2 py-2 text-white">
        <span className="px-3 text-sm font-medium tabular-nums">{index + 1} / {images.length}</span>
        <IconButton label="Close" onClick={onClose} className="text-white hover:bg-white/10 hover:text-white" autoFocus>
          <X className="h-5 w-5" />
        </IconButton>
      </div>
      <div ref={track} className="snap-row flex-1" onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {images.map((img) => (
          <div key={img.id} className="flex h-full w-full shrink-0 items-center justify-center p-2" style={{ touchAction: 'pan-x pinch-zoom' }}>
            <Img src={img.url} alt={img.alt ?? name} preset="gallery" sizes="100vw" className="max-h-full max-w-full object-contain" />
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

export function Gallery({ images, name }: { images: Images; name: string }) {
  const desktop = useMediaQuery('(min-width: 640px)');
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setActive(0);
    if (track.current) track.current.scrollLeft = 0;
  }, [images]);
  const current = images[active];

  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const viewer = lightbox && <Lightbox images={images} name={name} start={active} onClose={() => setLightbox(false)} />;

  // Phones: an edge-to-edge strip the customer swipes through, with position dots.
  if (!desktop) {
    return (
      <div className="relative -mx-4">
        <div
          ref={track}
          className="snap-row"
          aria-roledescription="carousel"
          aria-label="Product images"
          onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {(images.length > 0 ? images : [null]).map((img, i) => (
            <button key={img?.id ?? 'empty'} type="button" onClick={() => img && setLightbox(true)} aria-label={`Image ${i + 1} of ${images.length}. Open full screen`} className="aspect-square w-full shrink-0 bg-stone-100">
              <Img src={img?.url} alt={img?.alt ?? name} eager={i === 0} preset="gallery" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
            {images.map((img, i) => (
              <span key={img.id} className={clsx('h-1.5 rounded-full shadow-sm transition-[width,background-color] duration-base', i === active ? 'w-5 bg-stone-900' : 'w-1.5 bg-stone-900/30')} />
            ))}
          </div>
        )}
        {viewer}
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-3">
      {images.length > 1 && (
        <div className="scrollbar-none flex max-h-[560px] flex-col gap-2 overflow-y-auto" role="tablist" aria-label="Product images">
          {images.map((img, i) => (
            <button
              key={img.id}
              role="tab"
              aria-selected={i === active}
              aria-label={`Image ${i + 1}`}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className={clsx('h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-stone-100 transition-opacity', i === active ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100')}
            >
              <Img src={img.url} alt="" preset="thumb" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setLightbox(true)}
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
        aria-label="Open full-size image"
        className="relative aspect-square w-full flex-1 cursor-zoom-in overflow-hidden rounded-3xl bg-stone-100"
      >
        <Img src={current?.url} alt={current?.alt ?? name} eager preset="gallery" className="h-full w-full object-cover" />
        {/* Hover zoom (pointer devices): a magnified layer follows the cursor. */}
        {zoom && current && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-no-repeat"
            style={{ backgroundImage: `url("${current.url}")`, backgroundSize: '220%', backgroundPosition: `${zoom.x}% ${zoom.y}%` }}
          />
        )}
      </button>
      {viewer}
    </div>
  );
}
