import { clsx } from '@/components/ui';
import { useSettings } from '@/hooks/useSettings';
import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Logo({ light }: { light?: boolean }) {
  const { data } = useSettings();
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2" aria-label={`${data?.store.name ?? 'ShopHub'} home`}>
      {data?.store.logoUrl ? (
        <img src={data.store.logoUrl} alt="" className="h-9 w-auto max-w-[140px] object-contain" />
      ) : (
        <span className={clsx('flex h-9 w-9 items-center justify-center rounded-xl', light ? 'bg-white text-ink' : 'bg-ink text-white')}>
          <ShoppingBag className="h-5 w-5" />
        </span>
      )}
      <span className={clsx('font-display text-xl font-extrabold tracking-tight', light ? 'text-white' : 'text-ink')}>{data?.store.name ?? 'ShopHub'}</span>
    </Link>
  );
}
