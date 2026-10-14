import clsx from 'clsx';
import { Minus, Plus } from 'lucide-react';

export function QuantityStepper({ value, onChange, max = 10, min = 1, disabled, size = 'md' }: { value: number; onChange: (v: number) => void; max?: number; min?: number; disabled?: boolean; size?: 'sm' | 'md' }) {
  const btn = clsx('flex items-center justify-center text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent', size === 'sm' ? 'h-8 w-8' : 'h-10 w-10');
  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-stone-300 bg-white" role="group" aria-label="Quantity">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="Decrease quantity">
        <Minus className="h-4 w-4" />
      </button>
      <span className={clsx('min-w-[2.25rem] text-center text-sm font-semibold tabular-nums', disabled && 'text-stone-400')} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
