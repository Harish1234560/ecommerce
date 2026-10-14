import { clsx } from '@/components/ui';
import { Img } from '@/components/ui/Img';
import { catalogService } from '@/services/catalogService';
import { money } from '@/utils/format';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export function SearchBox({ className, autoFocus, onDone }: { className?: string; autoFocus?: boolean; onDone?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setOpen(false), [location.key]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const suggestions = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: ({ signal }) => catalogService.suggest(debounced, signal),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    onDone?.();
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form ref={box} onSubmit={submit} role="search" className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search for products, brands and more"
        aria-label="Search products"
        className="h-11 w-full rounded-full border border-stone-200 bg-stone-100 pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-500 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      {open && debounced.length >= 2 && (suggestions.data?.length ?? 0) > 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lift">
          {suggestions.data!.map((p) => (
            <Link key={p.id} to={`/product/${p.slug}`} onClick={() => { setOpen(false); onDone?.(); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50">
              <Img src={p.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-stone-800">{p.name}</span>
                <span className="text-xs text-stone-500">{p.category.name}</span>
              </span>
              <span className="text-sm font-semibold text-stone-900">{money(p.sellingPrice)}</span>
            </Link>
          ))}
          <button type="submit" className="block w-full border-t border-stone-100 px-3 py-2.5 text-left text-sm font-semibold text-brand-700 hover:bg-stone-50">
            See all results for “{q.trim()}”
          </button>
        </div>
      )}
    </form>
  );
}
