import { clsx } from '@/components/ui';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { adminInventoryService } from '@/services/adminService';
import { type InventoryRow } from '@/types/admin';
import { formatDateTime } from '@/utils/format';
import { useQuery } from '@tanstack/react-query';

const TXN_LABEL: Record<string, string> = { RESTOCK: 'Restock', ADJUSTMENT: 'Adjustment', RESERVE: 'Reserved for order', RELEASE: 'Reservation released', SALE: 'Sale', CANCEL: 'Order cancelled', RETURN: 'Return received' };

export function HistoryModal({ row, onClose }: { row: InventoryRow; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'inventory', 'history', row.id], queryFn: () => adminInventoryService.history(row.id) });
  return (
    <Modal open onClose={onClose} title={`Stock history — ${row.name}${row.variantLabel ? ` (${row.variantLabel})` : ''}`} size="lg">
      {isLoading ? <Skeleton className="h-40 w-full" /> : error ? <ErrorState error={error} compact /> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><th className="py-2">When</th><th>Type</th><th className="text-right">Change</th><th className="text-right">Stock after</th><th className="pl-4">Note</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data?.map((t) => {
              const change = t.quantity !== 0 ? t.quantity : null;
              return (
                <tr key={t.id}>
                  <td className="whitespace-nowrap py-2 text-slate-500">{formatDateTime(t.createdAt)}</td>
                  <td className="text-slate-800">{TXN_LABEL[t.type] ?? t.type}</td>
                  <td className={clsx('text-right font-semibold tabular-nums', change === null ? 'text-slate-400' : change > 0 ? 'text-emerald-700' : 'text-rose-600')}>{change === null ? `${t.reservedDelta > 0 ? '+' : ''}${t.reservedDelta} reserved` : `${change > 0 ? '+' : ''}${change}`}</td>
                  <td className="text-right tabular-nums">{t.stockAfter}</td>
                  <td className="pl-4 text-slate-500">{t.note}{t.adminName && <span className="text-slate-400"> · {t.adminName}</span>}</td>
                </tr>
              );
            })}
            {data?.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No stock movements yet</td></tr>}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
