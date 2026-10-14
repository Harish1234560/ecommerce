import { clsx } from '@/components/ui';
import { Img } from '@/components/ui/Img';
import { Modal } from '@/components/ui/Modal';
import type { ProductDetail } from '@/types';
import { useEffect, useState, type MouseEvent } from 'react';

export function Gallery({ images, name }: { images: ProductDetail['images']; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  useEffect(() => setActive(0), [images]);
  const current = images[active];

  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto sm:max-h-[560px] sm:flex-col sm:overflow-y-auto" role="tablist" aria-label="Product images">
          {images.map((img, i) => (
            <button
              key={img.id}
              role="tab"
              aria-selected={i === active}
              aria-label={`Image ${i + 1}`}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className={clsx('h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-stone-100 transition sm:h-20 sm:w-20', i === active ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100')}
            >
              <Img src={img.url} alt="" className="h-full w-full object-cover" />
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
        <Img
          src={current?.url}
          alt={current?.alt ?? name}
          eager
          className="h-full w-full object-cover transition-transform duration-200 ease-out"
        />
        {/* Hover zoom (pointer devices): a magnified layer follows the cursor. */}
        {zoom && current && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden bg-no-repeat md:block"
            style={{ backgroundImage: `url("${current.url}")`, backgroundSize: '220%', backgroundPosition: `${zoom.x}% ${zoom.y}%` }}
          />
        )}
      </button>
      <Modal open={lightbox} onClose={() => setLightbox(false)} title={name} size="xl">
        <Img src={current?.url} alt={current?.alt ?? name} className="mx-auto max-h-[75vh] w-auto rounded-xl object-contain" />
      </Modal>
    </div>
  );
}
