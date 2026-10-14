import { toast } from '@/store/toast';
import type { Offer } from '@/types';
import { formatDate, money } from '@/utils/format';
import { Copy } from 'lucide-react';

export function OfferCard({ offer }: { offer: Offer }) {
  const value = offer.discountType === 'PERCENTAGE' ? `${offer.value}% OFF` : `${money(offer.value)} OFF`;
  const scope = [...offer.categories.map((c) => c.name), ...offer.products.map((p) => p.name)];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(offer.code);
      toast.success(`Code ${offer.code} copied`);
    } catch {
      toast.info(`Use code ${offer.code} at checkout`);
    }
  };
  return (
    <div className="relative flex overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex w-28 shrink-0 flex-col items-center justify-center bg-brand-700 px-3 py-5 text-center text-white">
        <span className="font-display text-xl font-extrabold leading-tight">{value}</span>
      </div>
      <div className="min-w-0 flex-1 p-4">
        <p className="line-clamp-2 text-sm font-medium text-stone-800">{offer.description ?? 'Special offer'}</p>
        <ul className="mt-1.5 space-y-0.5 text-xs text-stone-500">
          {offer.minOrder > 0 && <li>Min. purchase {money(offer.minOrder)}</li>}
          {offer.maxDiscount != null && <li>Max. discount {money(offer.maxDiscount)}</li>}
          {scope.length > 0 && <li className="truncate">On: {scope.join(', ')}</li>}
          {offer.expiresAt && <li>Valid till {formatDate(offer.expiresAt)}</li>}
        </ul>
        <button onClick={copy} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-brand-600 bg-brand-50 px-3 py-1.5 text-sm font-bold tracking-wide text-brand-800 transition hover:bg-brand-100" aria-label={`Copy coupon code ${offer.code}`}>
          {offer.code} <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
