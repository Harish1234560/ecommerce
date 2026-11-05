import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GuestLine {
  productId: string;
  variantId: string | null;
  quantity: number;
}

interface GuestCartState {
  items: GuestLine[];
  couponCode: string | null;
  setItems: (items: GuestLine[]) => void;
  setCoupon: (code: string | null) => void;
  clear: () => void;
}

export const useGuestCart = create<GuestCartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      setItems: (items) => set({ items }),
      setCoupon: (couponCode) => set({ couponCode }),
      clear: () => set({ items: [], couponCode: null }),
    }),
    { name: 'shophub-guest-cart' },
  ),
);
