import { ApiError, errorMessage } from '@/api/client';
import { cartService } from '@/services/cartService';
import { useAuth } from '@/store/auth';
import { useGuestCart, type GuestLine } from '@/store/guestCart';
import { toast } from '@/store/toast';
import type { Cart, CartLine } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const EMPTY_CART: Cart = {
  items: [],
  saved: [],
  summary: { itemCount: 0, mrpTotal: 0, discount: 0, subtotal: 0, couponCode: null, couponDiscount: 0, shippingFee: 0, freeShippingAbove: null, tax: 0, taxInclusive: true, total: 0 },
  coupon: null,
  couponError: null,
  hasIssues: false,
  shipping: { deliverable: true, zone: null, fee: 0, freeAbove: null, minDays: 0, maxDays: 0, codAvailable: true },
};

const MAX_QTY = 10;

// One cart API for both signed-in customers (server cart) and guests (browser cart priced by the server).
export function useCart(pincode?: string | null) {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.status === 'ready');
  const guestItems = useGuestCart((s) => s.items);
  const guestCoupon = useGuestCart((s) => s.couponCode);
  const qc = useQueryClient();

  const key = user ? ['cart', 'user', pincode ?? null] : ['cart', 'guest', guestItems, guestCoupon, pincode ?? null];
  const query = useQuery({
    queryKey: key,
    enabled: ready,
    placeholderData: (prev) => prev,
    queryFn: () => {
      if (user) return cartService.get(pincode);
      if (guestItems.length === 0) return EMPTY_CART;
      return cartService.quote({ items: guestItems, couponCode: guestCoupon, pincode: pincode ?? null });
    },
  });

  const setServerCart = (cart: Cart) => {
    qc.setQueryData(['cart', 'user', pincode ?? null], cart);
    void qc.invalidateQueries({ queryKey: ['cart'], refetchType: 'none' });
  };

  const add = useMutation({
    mutationFn: async (input: { productId: string; variantId?: string | null; quantity?: number }) => {
      const quantity = input.quantity ?? 1;
      const variantId = input.variantId ?? null;
      if (user) return setServerCart(await cartService.addItem({ productId: input.productId, variantId, quantity }));

      const guest = useGuestCart.getState();
      const existing = guest.items.find((i) => i.productId === input.productId && i.variantId === variantId);
      const next: GuestLine = { productId: input.productId, variantId, quantity: Math.min((existing?.quantity ?? 0) + quantity, MAX_QTY) };
      // Ask the server whether this line is purchasable before storing it.
      const quote = await cartService.quote({ items: [next] });
      const line = quote.items[0];
      if (!line || line.issue) {
        const variantNeeded = line?.issue === 'UNAVAILABLE' && !variantId;
        throw new ApiError(line?.issueMessage ?? 'This product is not available', 409, undefined, variantNeeded ? 'VARIANT_REQUIRED' : (line?.issue ?? 'UNAVAILABLE'));
      }
      guest.setItems([...guest.items.filter((i) => i !== existing), next]);
    },
    onSuccess: () => toast.success('Added to cart'),
  });

  const update = useMutation({
    mutationFn: async ({ line, quantity }: { line: CartLine; quantity: number }) => {
      if (user) return setServerCart(await cartService.updateItem(line.id, { quantity }));
      const guest = useGuestCart.getState();
      const quote = await cartService.quote({ items: [{ productId: line.productId, variantId: line.variantId, quantity }] });
      const issue = quote.items[0]?.issue;
      if (issue) throw new ApiError(quote.items[0]?.issueMessage ?? 'Not enough stock', 409);
      guest.setItems(guest.items.map((i) => (i.productId === line.productId && i.variantId === line.variantId ? { ...i, quantity } : i)));
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: async (line: CartLine) => {
      if (user) return setServerCart(await cartService.removeItem(line.id));
      const guest = useGuestCart.getState();
      guest.setItems(guest.items.filter((i) => !(i.productId === line.productId && i.variantId === line.variantId)));
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const saveForLater = useMutation({
    mutationFn: async ({ line, saved }: { line: CartLine; saved: boolean }) => setServerCart(await cartService.updateItem(line.id, { savedForLater: saved })),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const applyCoupon = useMutation({
    mutationFn: async (code: string) => {
      if (user) return setServerCart(await cartService.applyCoupon(code));
      const guest = useGuestCart.getState();
      const quote = await cartService.quote({ items: guest.items, couponCode: code });
      if (!quote.coupon) throw new ApiError(quote.couponError ?? 'This coupon code is not valid', 400);
      guest.setCoupon(quote.coupon.code);
    },
    onSuccess: () => toast.success('Coupon applied'),
  });

  const removeCoupon = useMutation({
    mutationFn: async () => {
      if (user) return setServerCart(await cartService.removeCoupon());
      useGuestCart.getState().setCoupon(null);
    },
  });

  return { cart: query.data ?? EMPTY_CART, query, add, update, remove, saveForLater, applyCoupon, removeCoupon, isGuest: !user };
}

export function useCartCount(): number {
  const { cart } = useCart();
  return cart.items.reduce((n, l) => n + l.quantity, 0);
}
