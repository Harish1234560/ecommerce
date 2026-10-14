import { Img } from '@/components/ui/Img';
import { Price } from '@/components/ui/Price';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { useCart } from '@/hooks/useCart';
import { toast } from '@/store/toast';
import type { CartLine } from '@/types';
import { money } from '@/utils/format';
import { motion } from 'framer-motion';
import { AlertTriangle, Bookmark, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CartItem({ line }: { line: CartLine }) {
  const { update, remove, saveForLater, isGuest } = useCart();
  const blocked = line.issue === 'UNAVAILABLE' || line.issue === 'OUT_OF_STOCK';
  const busy = update.isPending || remove.isPending || saveForLater.isPending;
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex gap-3 py-5 sm:gap-5">
      <Link to={line.slug ? `/product/${line.slug}` : '#'} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-28 sm:w-28">
        <Img src={line.image} alt={line.name} className={`h-full w-full object-cover ${blocked ? 'opacity-50 grayscale' : ''}`} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {line.brand && <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{line.brand}</p>}
            <Link to={line.slug ? `/product/${line.slug}` : '#'} className="line-clamp-2 text-sm font-medium text-stone-900 hover:text-brand-700 sm:text-base">{line.name}</Link>
            {line.variantLabel && <p className="mt-0.5 text-xs text-stone-500">{line.variantLabel}</p>}
          </div>
          {!blocked && <p className="hidden shrink-0 text-base font-bold tabular-nums text-stone-900 sm:block">{money(line.lineTotal)}</p>}
        </div>

        {!blocked && <Price price={line.unitPrice} mrp={line.mrp} size="sm" className="mt-1.5" />}
        {line.issue && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600" role="alert">
            <AlertTriangle className="h-3.5 w-3.5" /> {line.issueMessage}
            {line.issue === 'INSUFFICIENT_STOCK' && (
              <button className="underline" onClick={() => update.mutate({ line, quantity: line.availableStock })}>Update to {line.availableStock}</button>
            )}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
          {!blocked && <QuantityStepper size="sm" value={line.quantity} max={Math.min(line.availableStock, 10)} disabled={busy} onChange={(quantity) => update.mutate({ line, quantity })} />}
          {!isGuest && !blocked && (
            <button className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900" disabled={busy} onClick={() => saveForLater.mutate({ line, saved: true }, { onSuccess: () => toast.success('Saved for later') })}>
              <Bookmark className="h-3.5 w-3.5" /> Save for later
            </button>
          )}
          <button className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-rose-600" disabled={busy} onClick={() => remove.mutate(line, { onSuccess: () => toast.success('Removed from cart') })}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>
    </motion.li>
  );
}
