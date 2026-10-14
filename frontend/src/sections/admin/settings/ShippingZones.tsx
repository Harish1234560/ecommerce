import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Feedback';
import { Checkbox, fieldErrors, Input } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useSettingsRefresh } from '@/hooks/useSettingsRefresh';
import { adminSettingsService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type ShippingZone } from '@/types/admin';
import { money, toPaise, toRupees } from '@/utils/format';
import { useMutation } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function ShippingZones({ zones }: { zones: ShippingZone[] }) {
  const refresh = useSettingsRefresh();
  const blank = { id: '', name: '', prefixes: '', fee: '', freeAbove: '', minDays: '3', maxDays: '7', codAvailable: true, isActive: true };
  const [editing, setEditing] = useState<typeof blank | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: (z: typeof blank) => {
      const body = { name: z.name, pincodePrefixes: z.prefixes.split(/[\s,]+/).filter(Boolean), fee: toPaise(z.fee), freeAbove: z.freeAbove ? toPaise(z.freeAbove) : null, minDays: Number(z.minDays), maxDays: Number(z.maxDays), codAvailable: z.codAvailable, isActive: z.isActive };
      return z.id ? adminSettingsService.updateShippingZone(z.id, body) : adminSettingsService.createShippingZone(body);
    },
    onSuccess: () => { toast.success('Delivery zone saved'); setEditing(null); refresh(); },
    onError: (err) => { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); },
  });
  const remove = useMutation({ mutationFn: (id: string) => adminSettingsService.removeShippingZone(id), onSuccess: () => { toast.success('Delivery zone deleted'); refresh(); }, onError: (err) => toast.error(errorMessage(err)) });
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <div><p className="text-sm font-semibold text-slate-900">Delivery zones</p><p className="text-xs text-slate-500">PIN-code prefixes with their own fee, delivery time and COD rule. The longest matching prefix wins.</p></div>
        <Button size="sm" variant="outline" className="h-8" onClick={() => { setErrors({}); setEditing(blank); }} icon={<Plus className="h-3.5 w-3.5" />}>Add zone</Button>
      </div>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {zones.map((z) => (
          <li key={z.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{z.name} {!z.isActive && <Badge>Off</Badge>}</p>
              <p className="truncate text-xs text-slate-500">PIN {z.pincodePrefixes.join(', ')} · {money(z.fee)}{z.freeAbove != null && `, free above ${money(z.freeAbove)}`} · {z.minDays}–{z.maxDays} days · COD {z.codAvailable ? 'yes' : 'no'}</p>
            </div>
            <button onClick={() => { setErrors({}); setEditing({ id: z.id, name: z.name, prefixes: z.pincodePrefixes.join(', '), fee: toRupees(z.fee), freeAbove: toRupees(z.freeAbove), minDays: String(z.minDays), maxDays: String(z.maxDays), codAvailable: z.codAvailable, isActive: z.isActive }); }} aria-label={`Edit ${z.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => remove.mutate(z.id)} aria-label={`Delete ${z.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {zones.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No zones — the default charges apply everywhere.</li>}
      </ul>
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? 'Edit delivery zone' : 'New delivery zone'} footer={<><Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" loading={save.isPending} disabled={editing.name.trim().length < 2 || !editing.prefixes.trim()} onClick={() => save.mutate(editing)}>Save zone</Button></>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Zone name" required wrapperClassName="sm:col-span-2" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} error={errors.name} />
            <Input label="PIN code prefixes" required wrapperClassName="sm:col-span-2" placeholder="400, 110, 5600" hint="Comma-separated. “400” matches every PIN starting with 400." value={editing.prefixes} onChange={(e) => setEditing({ ...editing, prefixes: e.target.value })} error={errors.pincodePrefixes ?? Object.entries(errors).find(([k]) => k.startsWith('pincodePrefixes'))?.[1]} />
            <Input label="Delivery charge" type="number" min="0" prefix="₹" value={editing.fee} onChange={(e) => setEditing({ ...editing, fee: e.target.value })} />
            <Input label="Free above" type="number" min="0" prefix="₹" hint="Blank = store default" value={editing.freeAbove} onChange={(e) => setEditing({ ...editing, freeAbove: e.target.value })} />
            <Input label="Min days" type="number" min="0" value={editing.minDays} onChange={(e) => setEditing({ ...editing, minDays: e.target.value })} />
            <Input label="Max days" type="number" min="0" value={editing.maxDays} onChange={(e) => setEditing({ ...editing, maxDays: e.target.value })} error={errors.maxDays} />
            <Checkbox label="Cash on Delivery available" checked={editing.codAvailable} onChange={(e) => setEditing({ ...editing, codAvailable: e.target.checked })} />
            <Checkbox label="Zone active" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
