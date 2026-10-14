import clsx from 'clsx';
import { Star } from 'lucide-react';
import { useState } from 'react';

export function Stars({ value, size = 'sm', className }: { value: number; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const px = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' }[size];
  return (
    <span className={clsx('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className={clsx('relative inline-block', px)}>
            <Star className={clsx('absolute inset-0 text-stone-300', px)} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={clsx('fill-amber-400 text-amber-400', px)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="rounded p-0.5"
        >
          <Star className={clsx('h-8 w-8 transition-colors', (hover || value) >= i ? 'fill-amber-400 text-amber-400' : 'text-stone-300')} />
        </button>
      ))}
    </div>
  );
}
