import { responsiveImage, type ImagePreset } from '@/utils/image';
import clsx from 'clsx';
import { ImagePlus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ImgProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Above-the-fold image: load immediately and with high priority. Everything else is lazy. */
  eager?: boolean;
  /** Which size family to request (see utils/image.ts). */
  preset?: ImagePreset;
  /** How wide the image is shown, e.g. "(min-width: 1024px) 25vw, 50vw". */
  sizes?: string;
}

const DEFAULT_SIZES: Record<ImagePreset, string> = {
  thumb: '96px',
  card: '(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw',
  gallery: '(min-width: 1024px) 45vw, 100vw',
  banner: '(min-width: 1280px) 1216px, 100vw',
};

// Product / banner image: right-sized via srcset, fades in over its placeholder background when
// loaded, and falls back to an icon when the URL is missing or broken. The parent reserves the
// space (aspect-ratio box), so nothing shifts when the image arrives.
export function Img({ src, alt, className, eager, preset = 'card', sizes }: ImgProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);
  if (!src || failed) {
    return (
      <div className={clsx('flex items-center justify-center bg-stone-100 text-stone-300', className)} role="img" aria-label={alt}>
        <ImagePlus className="h-1/4 max-h-10 w-1/4 max-w-10" />
      </div>
    );
  }
  const image = responsiveImage(src, preset);
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={image.srcSet ? (sizes ?? DEFAULT_SIZES[preset]) : undefined}
      alt={alt}
      className={clsx(className, 'transition-opacity duration-slow', !loaded && !eager && 'opacity-0')}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      ref={(el) => {
        // Already in the browser cache: show it straight away.
        if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true);
      }}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
