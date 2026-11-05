import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Stars } from '@/components/ui/Rating';
import { useSeo } from '@/hooks/useSeo';
import { ReviewModal, type ReviewTarget } from '@/sections/reviews/ReviewModal';
import { reviewService } from '@/services/accountService';
import { toast } from '@/store/toast';
import type { MyReview } from '@/types';
import { formatDate } from '@/utils/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export function ReviewsPage() {
  useSeo({ title: 'My Reviews', noindex: true });
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [deleting, setDeleting] = useState<MyReview | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['reviews', 'mine'], queryFn: () => reviewService.mine() });

  // Deep link from an order: /account/reviews?product=<id> opens the form for that product.
  const wanted = params.get('product');
  useEffect(() => {
    if (!wanted || !data) return;
    const p = data.pending.find((x) => x.productId === wanted);
    if (p) setTarget({ productId: p.productId, name: p.name, image: p.image });
    setParams({}, { replace: true });
  }, [wanted, data, setParams]);

  const remove = useMutation({
    mutationFn: (id: string) => reviewService.remove(id),
    onSuccess: () => {
      toast.success('Review deleted');
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ['reviews'] });
      void qc.invalidateQueries({ queryKey: ['product'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-stone-900">My reviews</h1>
      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : error || !data ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-8">
          {data.pending.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">Waiting for your review ({data.pending.length})</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.pending.map((p) => (
                  <li key={p.productId} className="card flex items-center gap-3 p-3">
                    <Img src={p.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/product/${p.slug}`} className="line-clamp-1 text-sm font-medium text-stone-900 hover:text-brand-700">{p.name}</Link>
                      <p className="text-xs text-stone-500">Delivered {formatDate(p.deliveredAt)}</p>
                      <Button size="sm" variant="outline" className="mt-2 h-8" onClick={() => setTarget({ productId: p.productId, name: p.name, image: p.image })} icon={<Star className="h-3.5 w-3.5" />}>Write a review</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">Your reviews ({data.reviews.length})</h2>
            {data.reviews.length === 0 ? (
              <div className="card"><EmptyState icon={<Star />} title="No reviews yet" message={data.pending.length ? 'Share your experience with the products you received.' : 'You can review products after they are delivered.'} /></div>
            ) : (
              <ul className="space-y-3">
                {data.reviews.map((r) => (
                  <li key={r.id} className="card p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <Link to={`/product/${r.product.slug}`}><Img src={r.product.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" /></Link>
                      <div className="min-w-0 flex-1">
                        <Link to={`/product/${r.product.slug}`} className="line-clamp-1 text-sm font-semibold text-stone-900 hover:text-brand-700">{r.product.name}</Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Stars value={r.rating} size="md" />
                          {r.status === 'PENDING' && <Badge tone="warning">Awaiting approval</Badge>}
                          {r.status === 'HIDDEN' && <Badge tone="danger">Hidden by moderator</Badge>}
                          {r.isVerified && r.status === 'APPROVED' && <Badge tone="success">Verified purchase</Badge>}
                        </div>
                      </div>
                      <div className="flex shrink-0">
                        <button onClick={() => setTarget({ productId: r.product.id, name: r.product.name, image: r.product.image, review: r })} aria-label="Edit review" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleting(r)} aria-label="Delete review" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    {r.title && <p className="mt-3 text-sm font-semibold text-stone-900">{r.title}</p>}
                    <p className="mt-1 text-sm leading-6 text-stone-700">{r.comment}</p>
                    {r.images.length > 0 && <div className="mt-3 flex gap-2">{r.images.map((img) => <Img key={img.id} src={img.url} alt="Your photo" className="h-16 w-16 rounded-lg object-cover" />)}</div>}
                    <p className="mt-2 text-xs text-stone-400">Reviewed on {formatDate(r.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      {target && <ReviewModal target={target} onClose={() => setTarget(null)} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending} danger title="Delete this review?" confirmLabel="Delete" message="This cannot be undone." />
    </div>
  );
}
