import { Img } from '@/components/ui/Img';
import { useCheckoutData } from '@/hooks/useCheckoutData';
import { money } from '@/utils/format';

export function CheckoutItems() {
  const { cart } = useCheckoutData();
  return (
    <ul className="divide-y divide-stone-200">
      {cart.items.map((l) => (
        <li key={l.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
          <Img src={l.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-medium text-stone-900">{l.name}</p>
            {l.variantLabel && <p className="text-xs text-stone-500">{l.variantLabel}</p>}
            <p className="mt-0.5 text-xs text-stone-500">Qty {l.quantity} × {money(l.unitPrice)}</p>
            {l.issue && <p className="mt-0.5 text-xs font-semibold text-rose-600">{l.issueMessage}</p>}
          </div>
          <p className="text-sm font-semibold tabular-nums text-stone-900">{money(l.lineTotal)}</p>
        </li>
      ))}
    </ul>
  );
}
