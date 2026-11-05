import { clsx } from '@/components/ui';
import { Check } from 'lucide-react';
import { type ReactNode } from 'react';

const STEPS = ['Address', 'Order Summary', 'Payment', 'Confirmation'];

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="mb-6 flex items-center" aria-label="Checkout steps">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className={clsx('flex items-center', i < STEPS.length - 1 && 'flex-1')} aria-current={active ? 'step' : undefined}>
            <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors', done ? 'bg-brand-600 text-white' : active ? 'bg-ink text-white' : 'bg-stone-200 text-stone-500')}>
              {done ? <Check className="h-4 w-4" /> : n}
            </span>
            <span className={clsx('ml-2 hidden whitespace-nowrap text-sm font-semibold sm:inline', active ? 'text-stone-900' : done ? 'text-brand-700' : 'text-stone-400')}>{label}</span>
            {i < STEPS.length - 1 && <span className={clsx('mx-2 h-0.5 flex-1 rounded sm:mx-4', done ? 'bg-brand-600' : 'bg-stone-200')} />}
          </li>
        );
      })}
    </ol>
  );
}

export function CheckoutShell({ step, title, children, aside, bar }: { step: number; title: string; children: ReactNode; aside?: ReactNode; bar?: ReactNode }) {
  return (
    <div className="container-page max-w-6xl py-6 lg:py-10">
      <Stepper current={step} />
      <h1 className="mb-5 text-2xl font-bold text-stone-900">{title}</h1>
      <div className={clsx('grid gap-6', aside && 'lg:grid-cols-[1fr_380px] lg:gap-8')}>
        <div className="min-w-0">{children}</div>
        {aside && <aside className="lg:sticky lg:top-44 lg:self-start">{aside}</aside>}
      </div>
      {bar}
    </div>
  );
}
