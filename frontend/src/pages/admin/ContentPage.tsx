import { Card } from '@/components/admin/Card';
import { Tabs } from '@/components/admin/Filters';
import { PageHeader } from '@/components/admin/PageHeader';
import { clsx } from '@/components/ui';
import { ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { useSeo } from '@/hooks/useSeo';
import { Announcement } from '@/sections/admin/content/Announcement';
import { Banners } from '@/sections/admin/content/Banners';
import { HomepageSections } from '@/sections/admin/content/HomepageSections';
import { Merchandising } from '@/sections/admin/content/Merchandising';
import { PageEditor } from '@/sections/admin/content/PageEditor';
import { Testimonials } from '@/sections/admin/content/Testimonials';
import { PAGE_LABEL } from '@/sections/admin/content/pageLabels';
import { adminContentService } from '@/services/adminService';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function ContentPage() {
  useSeo({ title: 'Banners & Homepage — Admin', noindex: true });
  const [tab, setTab] = useState<'home' | 'pages'>('home');
  const [slug, setSlug] = useState('about');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'content'], queryFn: () => adminContentService.get() });
  const page = data?.pages.find((p) => p.slug === slug);

  return (
    <div>
      <PageHeader title="Banners & homepage" subtitle="Control what customers see on the storefront" actions={<Tabs value={tab} onChange={setTab} tabs={[{ value: 'home', label: 'Homepage' }, { value: 'pages', label: 'Pages & policies' }]} />} />
      {isLoading ? <PageSpinner /> : error || !data ? <ErrorState error={error} onRetry={() => void refetch()} /> : tab === 'home' ? (
        <div className="space-y-4">
          <Banners banners={data.banners} />
          <HomepageSections sections={data.sections} />
          <Merchandising />
          <Testimonials items={data.testimonials} />
          <Announcement />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <Card padded={false} className="h-fit">
            <ul className="p-2">
              {data.pages.map((p) => (
                <li key={p.slug}><button onClick={() => setSlug(p.slug)} className={clsx('block w-full rounded-lg px-3 py-2 text-left text-sm font-medium', slug === p.slug ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100')}>{PAGE_LABEL[p.slug] ?? p.title}</button></li>
              ))}
            </ul>
          </Card>
          <Card title={page ? (PAGE_LABEL[page.slug] ?? page.title) : 'Page'}>{page ? <PageEditor key={page.slug} page={page} /> : <p className="text-sm text-slate-500">Select a page.</p>}</Card>
        </div>
      )}
    </div>
  );
}
