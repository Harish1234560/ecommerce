import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { FilterSelect, SearchInput, Tabs } from '@/components/admin/Filters';
import { PageHeader } from '@/components/admin/PageHeader';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Badge, ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { Stars } from '@/components/ui/Rating';
import { useSeo } from '@/hooks/useSeo';
import { adminReviewService } from '@/services/adminService';
import { toast } from '@/store/toast';
import { type AdminReview, type ReviewStatus } from '@/types/admin';
import { formatDate } from '@/utils/format';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

const REVIEW_TONE = { PENDING: 'warning', APPROVED: 'success', HIDDEN: 'neutral' } as const;

export function ReviewsPage() {
  useSeo({ title: 'Reviews — Admin', noindex: true });
  const qc = useQueryClient();
  const [status, setStatus] = useState<ReviewStatus | ''>('');
  const [rating, setRating] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<AdminReview | null>(null);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin', 'reviews', status, rating, q, page],
    queryFn: () => adminReviewService.list({ status, rating, q, page, limit: 10 }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    void qc.invalidateQueries({ queryKey: ['product'] });
    void qc.invalidateQueries({ queryKey: ['reviews'] });
  };
  const moderate = useMutation({
    mutationFn: ({ id, status: s }: { id: string; status: ReviewStatus }) => adminReviewService.setStatus(id, s),
    onSuccess: (_r, v) => { toast.success(v.status === 'APPROVED' ? 'Review approved' : 'Review hidden'); refresh(); },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminReviewService.remove(id),
    onSuccess: () => { toast.success('Review deleted'); setDeleting(null); refresh(); },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const counts = data?.meta.statusCounts ?? {};

  return (
    <div>
      <PageHeader title="Reviews" subtitle="Approve, hide or remove customer reviews" />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
          <Tabs value={status} onChange={(s) => { setStatus(s); setPage(1); }} tabs={[{ value: '' as const, label: 'All' }, { value: 'PENDING' as const, label: 'Pending', count: counts.PENDING ?? 0 }, { value: 'APPROVED' as const, label: 'Approved', count: counts.APPROVED ?? 0 }, { value: 'HIDDEN' as const, label: 'Hidden', count: counts.HIDDEN ?? 0 }]} />
          <div className="flex flex-wrap gap-2">
            <FilterSelect label="Rating" value={rating} onChange={(r) => { setRating(r); setPage(1); }} options={[{ value: '', label: 'All ratings' }, ...[5, 4, 3, 2, 1].map((r) => ({ value: String(r), label: `${r} star${r > 1 ? 's' : ''}` }))]} />
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search review, product, customer" />
          </div>
        </div>
        {error ? <ErrorState error={error} onRetry={() => void refetch()} compact /> : isLoading ? <PageSpinner /> : data?.data.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-slate-500">No reviews match these filters</p>
        ) : (
          <ul className={clsx('divide-y divide-slate-100', isFetching && 'opacity-70')}>
            {data?.data.map((r) => (
              <li key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={r.rating} size="md" />
                      <Badge tone={REVIEW_TONE[r.status]}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge>
                      {r.isVerified && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Verified purchase</span>}
                    </div>
                    <p className="mt-1.5 text-sm text-slate-500">
                      <a href={`/product/${r.product.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-slate-900 hover:text-indigo-600">{r.product.name}</a> · by {r.user.name} ({r.user.email}) · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {r.status !== 'APPROVED' && <Button size="sm" className="h-8" loading={moderate.isPending && moderate.variables?.id === r.id} onClick={() => moderate.mutate({ id: r.id, status: 'APPROVED' })} icon={<Eye className="h-3.5 w-3.5" />}>Approve</Button>}
                    {r.status !== 'HIDDEN' && <Button size="sm" variant="outline" className="h-8" onClick={() => moderate.mutate({ id: r.id, status: 'HIDDEN' })} icon={<EyeOff className="h-3.5 w-3.5" />}>Hide</Button>}
                    <Button size="sm" variant="outline" className="h-8 text-rose-600" onClick={() => setDeleting(r)} icon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
                  </div>
                </div>
                {r.title && <p className="mt-3 text-sm font-semibold text-slate-900">{r.title}</p>}
                <p className="mt-1 text-sm leading-6 text-slate-700">{r.comment}</p>
                {r.images.length > 0 && <div className="mt-3 flex gap-2">{r.images.map((img) => <a key={img.id} href={img.url} target="_blank" rel="noreferrer"><Img src={img.url} alt="Review photo" className="h-16 w-16 rounded-lg object-cover" /></a>)}</div>}
              </li>
            ))}
          </ul>
        )}
        {data && data.meta.pages > 1 && <div className="border-t border-slate-100 p-3"><Pagination page={page} pages={data.meta.pages} onChange={setPage} /></div>}
      </Card>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending} danger title="Delete review?" confirmLabel="Delete" message="This permanently removes the review and updates the product's rating." />
    </div>
  );
}
