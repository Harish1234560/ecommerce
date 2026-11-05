import { errorMessage } from '@/api/client';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Form';
import { useContentRefresh } from '@/hooks/useContentRefresh';
import { PAGE_LABEL } from '@/sections/admin/content/pageLabels';
import { adminContentService } from '@/services/adminService';
import { toast } from '@/store/toast';
import type { AboutData } from '@/types';
import { type EditablePage } from '@/types/admin';
import { formatDateTime } from '@/utils/format';
import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

function PairList<T extends Record<string, string>>({ label, items, fields, onChange }: { label: string; items: T[]; fields: { key: keyof T & string; placeholder: string; wide?: boolean }[]; onChange: (items: T[]) => void }) {
  const blank = Object.fromEntries(fields.map((f) => [f.key, ''])) as T;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between"><p className="text-sm font-medium text-slate-700">{label}</p><Button size="sm" variant="ghost" className="h-7" onClick={() => onChange([...items, blank])} icon={<Plus className="h-3.5 w-3.5" />}>Add</Button></div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            {fields.map((f) => (
              <input key={f.key} aria-label={f.placeholder} placeholder={f.placeholder} value={item[f.key]} onChange={(e) => onChange(items.map((x, n) => (n === i ? { ...x, [f.key]: e.target.value } : x)))} className={clsx('field', f.wide ? 'flex-[2]' : 'flex-1')} />
            ))}
            <button type="button" onClick={() => onChange(items.filter((_, n) => n !== i))} aria-label="Remove" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">None added.</p>}
      </div>
    </div>
  );
}

export function PageEditor({ page }: { page: EditablePage }) {
  const refresh = useContentRefresh();
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body);
  const [about, setAbout] = useState<AboutData>(page.data ?? {});
  const save = useMutation({
    mutationFn: () => adminContentService.updatePage(page.slug, { title, body, data: page.slug === 'about' ? about : {} }),
    onSuccess: () => { toast.success(`${PAGE_LABEL[page.slug] ?? page.title} saved`); refresh(); },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const set = <K extends keyof AboutData>(k: K, v: AboutData[K]) => setAbout((a) => ({ ...a, [k]: v }));
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Input label="Page title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      {page.slug === 'about' ? (
        <>
          <Input label="Headline" value={about.heroTitle ?? ''} onChange={(e) => set('heroTitle', e.target.value)} />
          <Textarea label="Intro" rows={2} value={about.heroSubtitle ?? ''} onChange={(e) => set('heroSubtitle', e.target.value)} />
          <Textarea label="Shop story" rows={5} value={about.story ?? ''} onChange={(e) => set('story', e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Textarea label="Mission" rows={3} value={about.mission ?? ''} onChange={(e) => set('mission', e.target.value)} />
            <Textarea label="Vision" rows={3} value={about.vision ?? ''} onChange={(e) => set('vision', e.target.value)} />
            <Textarea label="Quality promise" rows={3} value={about.qualityPromise ?? ''} onChange={(e) => set('qualityPromise', e.target.value)} />
            <Textarea label="Customer-first approach" rows={3} value={about.customerFirst ?? ''} onChange={(e) => set('customerFirst', e.target.value)} />
          </div>
          <PairList label="Why choose us" items={about.whyChooseUs ?? []} fields={[{ key: 'title', placeholder: 'Title' }, { key: 'text', placeholder: 'Description', wide: true }]} onChange={(v) => set('whyChooseUs', v)} />
          <PairList label="Shop statistics" items={about.stats ?? []} fields={[{ key: 'value', placeholder: 'Value (e.g. 25,000+)' }, { key: 'label', placeholder: 'Label (e.g. Happy customers)' }]} onChange={(v) => set('stats', v)} />
          <PairList label="Team" items={about.team ?? []} fields={[{ key: 'name', placeholder: 'Name' }, { key: 'role', placeholder: 'Role' }]} onChange={(v) => set('team', v)} />
          <Textarea label="Business information" rows={3} value={about.businessInfo ?? ''} onChange={(e) => set('businessInfo', e.target.value)} />
        </>
      ) : (
        <Textarea label="Content" rows={18} className="font-mono text-[13px]" value={body} onChange={(e) => setBody(e.target.value)} hint="Formatting: “## Heading”, “- list item”, **bold**. Leave a blank line between paragraphs." />
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Last updated {formatDateTime(page.updatedAt)}</p>
        <div className="flex gap-2">
          <a href={`/${page.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Preview</a>
          <Button type="submit" size="sm" loading={save.isPending}>Save page</Button>
        </div>
      </div>
    </form>
  );
}
