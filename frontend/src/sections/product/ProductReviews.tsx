import { SectionHeading } from '@/components/common/SectionHeading';
import { clsx } from '@/components/ui';
import { Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { Pagination } from '@/components/ui/Pagination';
import { Stars } from '@/components/ui/Rating';
import { catalogService } from '@/services/catalogService';
import type { ProductDetail } from '@/types';
import { formatDate } from '@/utils/format';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function ProductReviews({ product }: { product: ProductDetail }) {
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState<number | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['reviews', product.slug, page, rating],
    queryFn: () => catalogService.productReviews(product.slug, { page, rating, limit: 5 }),
    placeholderData: keepPreviousData,
  });
  const total = product.ratingCount;

  return (
    <section id="reviews" className="scroll-mt-44">
      <SectionHeading title="Ratings & reviews" />
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="card h-fit p-6">
          <div className="flex items-end gap-3">
            <span className="font-display text-5xl font-extrabold text-stone-900">{total > 0 ? product.ratingAvg.toFixed(1) : '—'}</span>
            <div className="pb-1">
              <Stars value={product.ratingAvg} size="md" />
              <p className="mt-0.5 text-xs text-stone-500">{total} verified review{total === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="mt-5 space-y-1.5">
            {[5, 4, 3, 2, 1].map((r) => {
              const count = product.ratingBreakdown[r] ?? 0;
              const pct = total ? (count / total) * 100 : 0;
              return (
                <button key={r} onClick={() => { setRating(rating === r ? null : r); setPage(1); }} aria-pressed={rating === r} className={clsx('flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs transition-colors hover:bg-stone-100', rating === r && 'bg-stone-100')}>
                  <span className="w-6 text-stone-600">{r}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-6 text-right text-stone-500">{count}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-5 text-xs leading-5 text-stone-500">Only customers who received this product can review it. <Link to="/account/reviews" className="font-semibold text-brand-700 hover:underline">Write a review</Link></p>
        </div>

        <div>
          {isLoading ? (
            <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
          ) : !data || data.data.length === 0 ? (
            <p className="card p-8 text-center text-sm text-stone-500">{rating ? `No ${rating}-star reviews yet.` : 'No reviews yet. Be the first to review this product after your purchase.'}</p>
          ) : (
            <>
              <ul className="divide-y divide-stone-200">
                {data.data.map((r) => (
                  <li key={r.id} className="py-5 first:pt-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Stars value={r.rating} size="md" />
                      {r.title && <span className="text-sm font-semibold text-stone-900">{r.title}</span>}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-700">{r.comment}</p>
                    {r.images.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {r.images.map((img) => (
                          <a key={img.id} href={img.url} target="_blank" rel="noreferrer"><Img src={img.url} alt="Customer photo" className="h-16 w-16 rounded-lg object-cover" /></a>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
                      <span className="font-medium text-stone-700">{r.user.name}</span>
                      {r.isVerified && <span className="inline-flex items-center gap-1 text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Verified purchase</span>}
                      <span>· {formatDate(r.createdAt)}</span>
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-4"><Pagination page={page} pages={data.meta.pages} onChange={setPage} /></div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
