import { ApiError, errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';
import { AlertCircle, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { type ReactNode } from 'react';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONE: Record<Tone, string> = {
  neutral: 'bg-stone-100 text-stone-700 ring-stone-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', TONE[tone], className)}>{children}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('h-5 w-5 animate-spin text-stone-400', className)} aria-label="Loading" />;
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden />;
}

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      {icon && <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-400 [&>svg]:h-7 [&>svg]:w-7">{icon}</div>}
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-sm text-stone-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Error state with a retry button; distinguishes network failures from server errors.
export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const network = error instanceof ApiError && error.isNetwork;
  const status = error instanceof ApiError ? error.status : 0;
  const title = network ? 'You appear to be offline' : status === 404 ? 'Not found' : status === 403 ? 'Access denied' : status === 401 ? 'Please sign in' : 'Something went wrong';
  return (
    <div className={clsx('flex flex-col items-center justify-center px-4 text-center', compact ? 'py-8' : 'py-14')} role="alert">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        {network ? <WifiOff className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
      </div>
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-stone-500">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry} icon={<RefreshCw className="h-4 w-4" />}>
          Try again
        </Button>
      )}
    </div>
  );
}
