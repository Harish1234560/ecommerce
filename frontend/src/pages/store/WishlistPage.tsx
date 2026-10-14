import { ApiError, errorMessage } from '@/api/client';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Img } from '@/components/ui/Img';
import { Price } from '@/components/ui/Price';
import { useSeo } from '@/hooks/useSeo';
import { wishlistService } from '@/services/cartService';
import { toast } from '@/store/toast';
import type { WishlistEntry } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function WishlistPage() {
  useSeo({ title: 'Wishlist', noindex: true });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['wishlist', 'items'], queryFn: () => wishlistService.list() });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['wishlist'] });
    void qc.invalidateQueries({ queryKey: ['cart'] });
  };
  const remove = useMutation({
    mutationFn: (productId: string) => wishlistService.remove(productId),
    onSuccess: () => {
      toast.success('Removed from wishlist');
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const move = useMutation({
    mutationFn: (entry: WishlistEntry) => wishlistService.moveToCart(entry.product.id),
    onSuccess: () => {
      toast.success('Moved to cart');
      refresh();
    },
    onError: (err, entry) => {
      if (err instanceof ApiError && err.code === 'VARIANT_REQUIRED') {
        toast.info('Choose a size / color to add this to your cart');
        navigate(`/product/${entry.product.slug}`);
      } else toast.error(errorMessage(err));
    },
  });

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-stone-900">My wishlist {data && data.length > 0 && <span className="text-base font-medium text-stone-500">({data.length})</span>}</h1>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <div className="card"><EmptyState icon={<Heart />} title="Your wishlist is empty" message="Tap the heart on any product to save it here." action={<Link to="/products" className={buttonClass('primary')}>Discover products</Link>} /></div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((entry) => {
            const p = entry.product;
            const inStock = entry.available && p.stock > 0;
            return (
              <li key={entry.id} className="card flex gap-4 p-3 sm:p-4">
                <Link to={`/product/${p.slug}`} className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-stone-100"><Img src={p.image} alt={p.name} className="h-full w-full object-cover" /></Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to={`/product/${p.slug}`} className="line-clamp-2 text-sm font-medium text-stone-900 hover:text-brand-700">{p.name}</Link>
                  <Price price={p.sellingPrice} mrp={p.price} size="sm" className="mt-1" />
                  <p className={`mt-1 text-xs font-semibold ${inStock ? 'text-emerald-700' : 'text-rose-600'}`}>{!entry.available ? 'No longer available' : inStock ? 'In stock' : 'Out of stock'}</p>
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <Button size="sm" disabled={!inStock} loading={move.isPending && move.variables?.id === entry.id} onClick={() => move.mutate(entry)} icon={<ShoppingBag className="h-4 w-4" />}>Move to cart</Button>
                    <Button size="sm" variant="ghost" aria-label={`Remove ${p.name} from wishlist`} onClick={() => remove.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
