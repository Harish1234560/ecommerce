import { money } from '@/utils/format';
import clsx from 'clsx';

export function Price({ price, mrp, size = 'md', className }: { price: number; mrp?: number; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const main = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-3xl' }[size];
  const off = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  return (
    <div className={clsx('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span className={clsx('font-bold text-stone-900', main)}>{money(price)}</span>
      {off > 0 && (
        <>
          <span className={clsx('text-stone-400 line-through', size === 'xl' ? 'text-base' : 'text-xs')}>
            <span className="sr-only">Original price </span>
            {money(mrp!)}
          </span>
          <span className={clsx('font-semibold text-emerald-700', size === 'xl' ? 'text-base' : 'text-xs')}>{off}% off</span>
        </>
      )}
    </div>
  );
}
