import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Markdown } from '@/components/common/Markdown';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useContent } from '@/hooks/useContent';
import { useSeo } from '@/hooks/useSeo';
import { formatDate } from '@/utils/format';
import { Link } from 'react-router-dom';

const POLICY_META: Record<string, string> = {
  'return-policy': 'How returns, cancellations and refunds work.',
  'shipping-policy': 'Shipping charges, delivery areas, estimated delivery times and COD rules.',
  privacy: 'What data we collect, how we use it and how we protect it.',
  terms: 'The terms that apply when you use this store.',
};

export function PolicyPage({ slug }: { slug: 'return-policy' | 'shipping-policy' | 'privacy' | 'terms' }) {
  const { data, isLoading, error, refetch } = useContent(slug);
  useSeo({ title: data?.title, description: POLICY_META[slug] });
  return (
    <div className="container-page max-w-3xl py-5 lg:py-8">
      <Breadcrumbs items={[{ label: data?.title ?? 'Policy' }]} />
      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-full" /></div>
      ) : error || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <article className="card p-6 sm:p-10">
          <h1 className="text-3xl font-bold text-stone-900">{data.title}</h1>
          <p className="mb-6 mt-2 text-sm text-stone-500">Last updated {formatDate(data.updatedAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <Markdown text={data.body} />
          <p className="mt-8 border-t border-stone-200 pt-5 text-sm text-stone-500">Need help? <Link to="/contact" className="font-semibold text-brand-700 hover:underline">Contact us</Link>.</p>
        </article>
      )}
    </div>
  );
}
