import { money } from '@/utils/format';
import { type ReactNode } from 'react';

// Phones: keeps the total and the primary action pinned to the bottom of the screen while the
// page content scrolls (it scrolls away with the page once the footer is reached).
export function MobileActionBar({ total, children }: { total: number; children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center gap-4 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
      <div className="shrink-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Total</p>
        <p className="text-lg font-bold leading-tight text-stone-900">{money(total)}</p>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
