import { errorMessage } from '@/api/client';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { adminInventoryService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type InventoryRow } from '@/types/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';

export function AdjustModal({ row, onClose }: { row: InventoryRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'increase' | 'decrease' | 'set'>('increase');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [threshold, setThreshold] = useState(String(row.lowStockThreshold));
  const qty = Number(quantity);
  const result = mode === 'increase' ? row.stock + qty : mode === 'decrease' ? row.stock - qty : qty;
  const invalid = quantity === '' || qty < 0 || !Number.isInteger(qty) || (mode !== 'set' && qty === 0) || result < row.reserved;
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] });
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: ['product'] });
  };
  const adjust = useMutation({
    mutationFn: () => adminInventoryService.adjust(row.id, { mode, quantity: qty, note: note.trim() || undefined }),
    onSuccess: () => { toast.success('Stock updated'); done(); onClose(); },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const saveThreshold = useMutation({
    mutationFn: () => adminInventoryService.setThreshold(row.id, Number(threshold || 0)),
    onSuccess: () => { toast.success('Low-stock threshold saved'); done(); },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <Modal open onClose={onClose} title="Adjust stock" footer={<><Button variant="outline" size="sm" onClick={onClose}>Close</Button><Button size="sm" disabled={invalid} loading={adjust.isPending} onClick={() => adjust.mutate()}>Update stock</Button></>}>
      <div className="space-y-4">
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          <p className="text-sm text-slate-500">SKU {row.sku}{row.variantLabel && ` · ${row.variantLabel}`}</p>
        </div>
        <dl className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-center text-sm">
          <div><dt className="text-xs text-slate-500">Current stock</dt><dd className="text-lg font-semibold">{row.stock}</dd></div>
          <div><dt className="text-xs text-slate-500">Reserved</dt><dd className="text-lg font-semibold">{row.reserved}</dd></div>
          <div><dt className="text-xs text-slate-500">Available</dt><dd className="text-lg font-semibold">{row.available}</dd></div>
        </dl>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Adjustment type">
          {([['increase', 'Increase', Plus], ['decrease', 'Decrease', Minus], ['set', 'Set exact', Pencil]] as const).map(([m, label, Icon]) => (
            <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={clsx('flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium', mode === m ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50')}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <Input label={mode === 'set' ? 'New stock level' : 'Quantity'} type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
          hint={quantity !== '' && !Number.isNaN(qty) ? (result < row.reserved ? undefined : `Stock after this change: ${result}`) : undefined}
          error={quantity !== '' && result < row.reserved ? (result < 0 ? 'Stock cannot go below zero' : `Cannot go below the ${row.reserved} units reserved by open orders`) : undefined} />
        <Input label="Reason / note" placeholder="e.g. New shipment received, damaged units" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        <div className="flex items-end gap-2 border-t border-slate-200 pt-4">
          <Input label="Low stock threshold" type="number" min="0" step="1" wrapperClassName="flex-1" value={threshold} onChange={(e) => setThreshold(e.target.value)} hint="Flag this item as low stock at or below this level" />
          <Button variant="outline" className="mb-[22px]" loading={saveThreshold.isPending} disabled={threshold === String(row.lowStockThreshold)} onClick={() => saveThreshold.mutate()}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
