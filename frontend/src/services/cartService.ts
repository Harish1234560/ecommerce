import { api } from '@/api/client';
import type { Cart, CartLineInput, WishlistEntry } from '@/types';

// Every cart call returns the cart freshly priced by the server.
export const cartService = {
  get: (pincode?: string | null) => api.get<Cart>('/cart', { pincode }),
  // Prices a guest's browser cart (no account needed).
  quote: (input: { items: CartLineInput[]; couponCode?: string | null; pincode?: string | null }) => api.post<Cart>('/cart/quote', input),
  addItem: (line: CartLineInput) => api.post<Cart>('/cart/items', line),
  updateItem: (itemId: string, changes: { quantity?: number; savedForLater?: boolean }) => api.patch<Cart>(`/cart/items/${itemId}`, changes),
  removeItem: (itemId: string) => api.delete<Cart>(`/cart/items/${itemId}`),
  applyCoupon: (code: string) => api.post<Cart>('/cart/coupon', { code }),
  removeCoupon: () => api.delete<Cart>('/cart/coupon'),
  // Folds a guest cart into the account cart after sign-in.
  merge: (items: CartLineInput[]) => api.post<Cart>('/cart/merge', { items }),
};

export const wishlistService = {
  list: () => api.get<WishlistEntry[]>('/wishlist'),
  productIds: () => api.get<string[]>('/wishlist/ids'),
  add: (productId: string) => api.post<void>('/wishlist', { productId }),
  remove: (productId: string) => api.delete<void>(`/wishlist/${productId}`),
  moveToCart: (productId: string) => api.post<void>(`/wishlist/${productId}/move-to-cart`),
};
