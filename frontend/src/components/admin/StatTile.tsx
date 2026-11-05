import { clsx } from '@/components/ui';
import { Skeleton } from '@/components/ui/Feedback';
import { type ReactNode } from 'react';

export function StatTile({ label, value, hint, icon, tone = 'default', loading }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'default' | 'warning' | 'danger'; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {icon && <span className={clsx('flex h-8 w-8 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4', tone === 'warning' ? 'bg-amber-50 text-amber-700' : tone === 'danger' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600')}>{icon}</span>}
      </div>
      {loading ? <Skeleton className="mt-2 h-7 w-24" /> : <p className="mt-1.5 text-2xl font-semibold text-slate-900">{value}</p>}
      {hint && !loading && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
