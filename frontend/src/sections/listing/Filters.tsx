import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Form';
import type { Category, Facets } from '@/types';
import { money } from '@/utils/format';
import { Star } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="border-b border-stone-200 py-4 first:pt-0 last:border-0">
      <h3 className="mb-3 font-sans text-sm font-semibold tracking-normal text-stone-900">{title}</h3>
      {children}
    </div>
  );
}

export function Filters({ params, set, facets, categories, lockedCategory }: { params: URLSearchParams; set: (changes: Record<string, string | null>) => void; facets?: Facets; categories?: Category[]; lockedCategory?: boolean }) {
  const [min, setMin] = useState(params.get('minPrice') ?? '');
  const [max, setMax] = useState(params.get('maxPrice') ?? '');
  useEffect(() => {
    setMin(params.get('minPrice') ?? '');
    setMax(params.get('maxPrice') ?? '');
  }, [params]);
  const brands = (params.get('brand') ?? '').split(',').filter(Boolean);
  const radio = 'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors';
  const applyPrice = (e: FormEvent) => {
    e.preventDefault();
    set({ minPrice: min || null, maxPrice: max || null });
  };

  return (
    <div>
      {!lockedCategory && categories && categories.length > 0 && (
        <FilterGroup title="Category">
          <div className="space-y-0.5">
            {categories.map((c) => {
              const active = params.get('category') === c.slug;
              return (
                <button key={c.id} onClick={() => set({ category: active ? null : c.slug })} aria-pressed={active} className={clsx(radio, active ? 'bg-brand-50 font-semibold text-brand-800' : 'text-stone-700 hover:bg-stone-100')}>
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-stone-400">{c.productCount}</span>
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Price">
        <form onSubmit={applyPrice} className="flex items-center gap-2">
          <input type="number" min={0} inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min ₹" aria-label="Minimum price" className="field !px-2.5 !py-2" />
          <span className="text-stone-400">–</span>
          <input type="number" min={0} inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max ₹" aria-label="Maximum price" className="field !px-2.5 !py-2" />
          <Button type="submit" size="sm" variant="outline">Go</Button>
        </form>
        {facets && facets.priceRange.max > 0 && <p className="mt-2 text-xs text-stone-500">Range: {money(facets.priceRange.min)} – {money(facets.priceRange.max)}</p>}
      </FilterGroup>

      <FilterGroup title="Customer rating">
        <div className="space-y-0.5">
          {[4, 3, 2].map((r) => {
            const active = params.get('rating') === String(r);
            return (
              <button key={r} onClick={() => set({ rating: active ? null : String(r) })} aria-pressed={active} className={clsx(radio, active ? 'bg-brand-50 font-semibold text-brand-800' : 'text-stone-700 hover:bg-stone-100')}>
                {r} <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> &amp; above
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Discount">
        <div className="flex flex-wrap gap-2">
          {[10, 20, 30, 50].map((d) => {
            const active = params.get('discount') === String(d);
            return (
              <button key={d} onClick={() => set({ discount: active ? null : String(d) })} aria-pressed={active} className={clsx('rounded-full border px-3 py-1 text-xs font-semibold transition-colors', active ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300 text-stone-700 hover:border-stone-400')}>
                {d}% or more
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Availability">
        <Checkbox label="In stock only" checked={params.get('inStock') === 'true'} onChange={(e) => set({ inStock: e.target.checked ? 'true' : null })} />
      </FilterGroup>

      {facets && facets.brands.length > 0 && (
        <FilterGroup title="Brand">
          <div className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
            {facets.brands.map((b) => (
              <Checkbox
                key={b.name}
                label={<span className="flex w-full items-center justify-between gap-2">{b.name} <span className="text-xs text-stone-400">{b.count}</span></span>}
                className="[&>span]:flex-1"
                checked={brands.includes(b.name)}
                onChange={(e) => {
                  const next = e.target.checked ? [...brands, b.name] : brands.filter((x) => x !== b.name);
                  set({ brand: next.join(',') || null });
                }}
              />
            ))}
          </div>
        </FilterGroup>
      )}
    </div>
  );
}
