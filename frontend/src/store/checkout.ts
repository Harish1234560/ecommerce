import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface CheckoutState {
  addressId: string | null;
  idempotencyKey: string;
  setAddress: (id: string | null) => void;
  newAttempt: () => void;
}

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const useCheckout = create<CheckoutState>()(
  persist(
    (set) => ({
      addressId: null,
      idempotencyKey: newKey(),
      setAddress: (addressId) => set({ addressId }),
      // A fresh key for the next order; the same key is reused if "Place order" is retried.
      newAttempt: () => set({ idempotencyKey: newKey() }),
    }),
    { name: 'shophub-checkout', storage: createJSONStorage(() => sessionStorage) },
  ),
);
