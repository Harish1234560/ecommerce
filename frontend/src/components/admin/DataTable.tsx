import { clsx } from '@/components/ui';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Inbox } from 'lucide-react';
import { type ReactNode } from 'react';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export function DataTable<T>({ columns, rows, rowKey, loading, error, onRetry, empty = 'Nothing to show yet', onRowClick, fetching }: { columns: Column<T>[]; rows?: T[]; rowKey: (row: T) => string; loading?: boolean; error?: unknown; onRetry?: () => void; empty?: string; onRowClick?: (row: T) => void; fetching?: boolean }) {
  if (error) return <ErrorState error={error} onRetry={onRetry} compact />;
  const align = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  return (
    <div className="overflow-x-auto">
      <table className={clsx('w-full min-w-[640px] text-sm transition-opacity', fetching && 'opacity-60')}>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {columns.map((c) => (
              <th key={c.header} scope="col" className={clsx('whitespace-nowrap px-4 py-3', align(c.align))}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading || !rows ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.header} className="px-4 py-3.5"><Skeleton className="h-4 w-full max-w-[140px]" /></td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-14 text-center">
                <Inbox className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">{empty}</p>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={clsx('transition-colors hover:bg-slate-50', onRowClick && 'cursor-pointer')}
              >
                {columns.map((c) => (
                  <td key={c.header} className={clsx('px-4 py-3 align-middle text-slate-700', align(c.align), c.className)}>{c.cell(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
