import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const cell = 'flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors';
  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button className={clsx(cell, 'text-stone-600 hover:bg-stone-100 disabled:opacity-40')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`e${i}`} className={clsx(cell, 'text-stone-400')}>
            …
          </span>
        ) : (
          <button key={n} onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined} className={clsx(cell, n === page ? 'btn-primary' : 'text-stone-700 hover:bg-stone-100')}>
            {n}
          </button>
        ),
      )}
      <button className={clsx(cell, 'text-stone-600 hover:bg-stone-100 disabled:opacity-40')} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
