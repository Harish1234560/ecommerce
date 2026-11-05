import { clsx } from '@/components/ui';
import { Img } from '@/components/ui/Img';
import { catalogService } from '@/services/catalogService';
import { useRecentSearches } from '@/store/recentSearches';
import { money } from '@/utils/format';
import { useQuery } from '@tanstack/react-query';
import { Clock, Search, TrendingUp, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/** Fired by the bottom navigation's Search button to focus the visible search box. */
export const FOCUS_SEARCH_EVENT = 'shop:focus-search';
const DEBOUNCE_MS = 300;

export function SearchBox({ className, autoFocus, onDone }: { className?: string; autoFocus?: boolean; onDone?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const recent = useRecentSearches();

  // Wait for a pause in typing before asking the server.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setOpen(false), [location.key]);
  useEffect(() => {
    const close = (e: MouseEvent | TouchEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const focus = () => {
      // Only the search box that is actually on screen responds.
      if (input.current?.offsetParent) input.current.focus();
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close, { passive: true });
    window.addEventListener(FOCUS_SEARCH_EVENT, focus);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      window.removeEventListener(FOCUS_SEARCH_EVENT, focus);
    };
  }, []);

  const typing = q.trim().length >= 2;
  const suggestions = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: ({ signal }) => catalogService.suggest(debounced, signal),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });
  const popular = useQuery({ queryKey: ['popular-searches'], queryFn: () => catalogService.popularSearches(), enabled: open && !typing, staleTime: 10 * 60_000 });

  const search = (term: string) => {
    const t = term.trim();
    if (!t) return;
    recent.add(t);
    setQ(t);
    setOpen(false);
    input.current?.blur();
    onDone?.();
    navigate(`/search?q=${encodeURIComponent(t)}`);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    search(q);
  };

  const results = typing && debounced.length >= 2 ? (suggestions.data ?? []) : [];
  const showIdeas = open && !typing && (recent.terms.length > 0 || (popular.data?.length ?? 0) > 0);
  const showResults = open && typing && results.length > 0;
  const chip = 'inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-stone-100 px-3 text-sm text-stone-700 transition-colors hover:bg-stone-200';

  return (
    <form ref={box} onSubmit={submit} role="search" className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
      <input
        ref={input}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="Search products, brands and more"
        aria-label="Search products"
        className="h-11 w-full rounded-full border border-stone-200 bg-stone-100 pl-10 pr-10 text-sm text-stone-900 placeholder:text-stone-500 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {q && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setQ('');
            input.current?.focus();
          }}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-stone-400 hover:text-stone-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {(showIdeas || showResults) && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-stone-200 bg-white shadow-lift">
          {showIdeas && (
            <div className="space-y-4 p-4">
              {recent.terms.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500"><Clock className="h-3.5 w-3.5" /> Recent searches</p>
                    <button type="button" onClick={recent.clear} className="-my-2 px-1 py-2 text-xs font-semibold text-brand-700 hover:underline">Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.terms.map((t) => (
                      <button key={t} type="button" onClick={() => search(t)} className={chip}>{t}</button>
                    ))}
                  </div>
                </div>
              )}
              {(popular.data?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500"><TrendingUp className="h-3.5 w-3.5" /> Popular searches</p>
                  <div className="flex flex-wrap gap-2">
                    {popular.data!.map((t) => (
                      <button key={t} type="button" onClick={() => search(t)} className={clsx(chip, 'capitalize')}>{t}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {showResults && (
            <>
              {results.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  onClick={() => {
                    recent.add(q);
                    setOpen(false);
                    onDone?.();
                  }}
                  className="flex min-h-[56px] items-center gap-3 px-3 py-2 hover:bg-stone-50"
                >
                  <Img src={p.image} alt="" preset="thumb" className="h-11 w-11 shrink-0 rounded-lg bg-stone-100 object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-stone-800">{p.name}</span>
                    <span className="text-xs text-stone-500">{p.category.name}</span>
                  </span>
                  <span className="text-sm font-semibold text-stone-900">{money(p.sellingPrice)}</span>
                </Link>
              ))}
              <button type="submit" className="block min-h-[48px] w-full border-t border-stone-100 px-3 text-left text-sm font-semibold text-brand-700 hover:bg-stone-50">
                See all results for “{q.trim()}”
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
