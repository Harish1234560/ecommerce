import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { fieldErrors, Toggle } from '@/components/ui/Form';
import { useSettingsRefresh } from '@/hooks/useSettingsRefresh';
import { adminSettingsService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type StoreSettings } from '@/types/admin';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

// A settings group form: keeps a draft, saves the whole group.
export function SettingsGroup<K extends keyof StoreSettings>({ title, subtitle, groupKey, value, children, extra }: { title: string; subtitle?: string; groupKey: K; value: StoreSettings[K]; children: (draft: StoreSettings[K], set: <F extends keyof StoreSettings[K]>(field: F, v: StoreSettings[K][F]) => void, errors: Record<string, string>) => ReactNode; extra?: ReactNode }) {
  const refresh = useSettingsRefresh();
  const [draft, setDraft] = useState(value);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => setDraft(value), [value]);
  const save = useMutation({
    mutationFn: () => adminSettingsService.updateGroup(groupKey, draft),
    onSuccess: () => { toast.success(`${title} saved`); setErrors({}); refresh(); },
    onError: (err) => { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); },
  });
  const dirty = JSON.stringify(draft) !== JSON.stringify(value);
  return (
    <Card title={title} subtitle={subtitle}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        {children(draft, (field, v) => setDraft((d) => ({ ...d, [field]: v })), errors)}
        <div className="flex justify-end"><Button type="submit" size="sm" loading={save.isPending} disabled={!dirty}>Save changes</Button></div>
      </form>
      {extra}
    </Card>
  );
}

export function SwitchRow({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div><p className="text-sm font-medium text-slate-800">{label}</p>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>
      <Toggle label={label} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function IntegrationStatus({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <p className={clsx('flex items-start gap-2 text-sm', ok ? 'text-emerald-700' : 'text-amber-700')}>{ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}<span>{children}</span></p>;
}
