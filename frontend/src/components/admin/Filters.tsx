import { clsx } from '@/components/ui';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

// Debounced search box for list pages.
export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== value) onChange(text);
    }, 300);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="field h-9 !py-0 pl-9" />
    </div>
  );
}

export function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="field h-9 w-auto !py-0 pr-8">
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={clsx('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', value === t.value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200/70')}
        >
          {t.label}
          {t.count !== undefined && <span className={clsx('rounded-full px-1.5 text-[11px] font-semibold', value === t.value ? 'bg-white/20' : 'bg-slate-200 text-slate-600')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
