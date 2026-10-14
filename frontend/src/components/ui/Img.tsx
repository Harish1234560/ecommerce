import clsx from 'clsx';
import { ImagePlus } from 'lucide-react';
import { useEffect, useState } from 'react';

// Product / banner image with a graceful fallback when the URL fails to load.
export function Img({ src, alt, className, eager }: { src: string | null | undefined; alt: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div className={clsx('flex items-center justify-center bg-stone-100 text-stone-300', className)} role="img" aria-label={alt}>
        <ImagePlus className="h-1/4 max-h-10 w-1/4 max-w-10" />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />;
}
