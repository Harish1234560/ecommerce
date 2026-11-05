import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Feedback';
import { Checkbox, Input, Select } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useSettingsRefresh } from '@/hooks/useSettingsRefresh';
import { adminSettingsService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type TaxRule } from '@/types/admin';
import { useMutation } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function TaxRules({ rules }: { rules: TaxRule[] }) {
  const refresh = useSettingsRefresh();
  const { data: categories } = useAdminCategories();
  const blank = { id: '', name: '', rate: '', categoryId: '', isDefault: false, isActive: true };
  const [editing, setEditing] = useState<typeof blank | null>(null);
  const save = useMutation({
    mutationFn: (r: typeof blank) => {
      const body = { name: r.name, rate: Number(r.rate), categoryId: r.isDefault ? null : r.categoryId || null, isDefault: r.isDefault, isActive: r.isActive };
      return r.id ? adminSettingsService.updateTaxRule(r.id, body) : adminSettingsService.createTaxRule(body);
    },
    onSuccess: () => { toast.success('Tax rule saved'); setEditing(null); refresh(); },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({ mutationFn: (id: string) => adminSettingsService.removeTaxRule(id), onSuccess: () => { toast.success('Tax rule deleted'); refresh(); }, onError: (err) => toast.error(errorMessage(err)) });
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <div><p className="text-sm font-semibold text-slate-900">Tax rules</p><p className="text-xs text-slate-500">Order of precedence: product tax → category rule → default rule → default rate.</p></div>
        <Button size="sm" variant="outline" className="h-8" onClick={() => setEditing(blank)} icon={<Plus className="h-3.5 w-3.5" />}>Add rule</Button>
      </div>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {rules.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0 flex-1"><p className="font-medium text-slate-900">{r.name} {r.isDefault && <Badge tone="info">Default</Badge>} {!r.isActive && <Badge>Off</Badge>}</p><p className="text-xs text-slate-500">{r.rate}% · {r.category ? r.category.name : 'All categories'}</p></div>
            <button onClick={() => setEditing({ id: r.id, name: r.name, rate: String(r.rate), categoryId: r.categoryId ?? '', isDefault: r.isDefault, isActive: r.isActive })} aria-label={`Edit ${r.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => remove.mutate(r.id)} aria-label={`Delete ${r.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {rules.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No tax rules — the default rate applies.</li>}
      </ul>
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? 'Edit tax rule' : 'New tax rule'} size="sm" footer={<><Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" loading={save.isPending} disabled={editing.name.trim().length < 2 || editing.rate === ''} onClick={() => save.mutate(editing)}>Save rule</Button></>}>
          <div className="space-y-4">
            <Input label="Rule name" required placeholder="GST 12% — Footwear" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input label="Rate (%)" required type="number" min="0" max="100" step="0.01" value={editing.rate} onChange={(e) => setEditing({ ...editing, rate: e.target.value })} />
            <Select label="Category" value={editing.categoryId} disabled={editing.isDefault} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}>
              <option value="">All categories</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Checkbox label="Default rule (applies when no category rule matches)" checked={editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} />
            <Checkbox label="Active" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
