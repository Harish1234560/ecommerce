import { errorMessage } from '@/api/client';
import { wishlistService } from '@/services/cartService';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

// Wishlist needs an account: guests are sent to sign in and brought back.
export function useWishlist() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const ids = useQuery({ queryKey: ['wishlist', 'ids'], queryFn: () => wishlistService.productIds(), enabled: !!user, staleTime: 60_000 });
  const set = new Set(ids.data ?? []);

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) {
        toast.info('Sign in to save items to your wishlist');
        navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        return null;
      }
      if (set.has(productId)) {
        await wishlistService.remove(productId);
        return false;
      }
      await wishlistService.add(productId);
      return true;
    },
    onMutate: async (productId) => {
      if (!user) return;
      // Optimistic heart toggle.
      const prev = qc.getQueryData<string[]>(['wishlist', 'ids']) ?? [];
      qc.setQueryData(['wishlist', 'ids'], prev.includes(productId) ? prev.filter((i) => i !== productId) : [...prev, productId]);
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['wishlist', 'ids'], ctx.prev);
      toast.error(errorMessage(err));
    },
    onSuccess: (added) => {
      if (added === null) return;
      toast.success(added ? 'Saved to wishlist' : 'Removed from wishlist');
      void qc.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  return { has: (id: string) => set.has(id), toggle: (id: string) => toggle.mutate(id), count: set.size };
}
