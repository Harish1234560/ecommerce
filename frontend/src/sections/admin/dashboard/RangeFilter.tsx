import { clsx } from '@/components/ui';
import { type DateRange, type RangePreset } from '@/types/admin';

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

// One filter row above everything it scopes.
export function RangeFilter({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex max-w-full overflow-x-auto rounded-lg border border-slate-300 bg-white text-[13px] font-medium sm:text-sm" role="group" aria-label="Date range">
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => onChange({ ...value, range: p.key })} aria-pressed={value.range === p.key} className={clsx('whitespace-nowrap px-2 py-1.5 transition-colors sm:px-3', value.range === p.key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>
            {p.label}
          </button>
        ))}
      </div>
      {value.range === 'custom' && (
        <div className="flex items-center gap-1.5 text-sm">
          <input type="date" aria-label="From date" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} className="field h-9 w-auto !py-0" />
          <span className="text-slate-400">to</span>
          <input type="date" aria-label="To date" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} className="field h-9 w-auto !py-0" />
        </div>
      )}
    </div>
  );
}
