import { setAccessToken, setSessionLostHandler } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import { authService } from '@/services/authService';
import { cartService } from '@/services/cartService';
import { useGuestCart } from '@/store/guestCart';
import { toast } from '@/store/toast';
import type { User } from '@/types';
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  status: 'loading' | 'ready';
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; phone?: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

// After sign-in, fold the browser cart into the account cart.
async function afterSignIn() {
  const guest = useGuestCart.getState();
  if (guest.items.length > 0) {
    try {
      await cartService.merge(guest.items);
      if (guest.couponCode) await cartService.applyCoupon(guest.couponCode).catch(() => {});
    } catch {
      /* the account cart is still usable */
    }
    guest.clear();
  }
  queryClient.clear();
}

let initPromise: Promise<void> | null = null;

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  // Restores the session from the refresh cookie on page load.
  init: () => {
    initPromise ??= (async () => {
      try {
        const session = await authService.session();
        if (session) {
          setAccessToken(session.accessToken);
          set({ user: session.user });
        }
      } catch {
        /* offline — continue as guest */
      }
      set({ status: 'ready' });
    })();
    return initPromise;
  },
  login: async (email, password) => {
    const data = await authService.login(email, password);
    setAccessToken(data.accessToken);
    await afterSignIn();
    set({ user: data.user });
    return data.user;
  },
  register: async (input) => {
    const data = await authService.register(input);
    setAccessToken(data.accessToken);
    await afterSignIn();
    set({ user: data.user });
    return data.user;
  },
  logout: async () => {
    await authService.logout().catch(() => {});
    setAccessToken(null);
    set({ user: null });
    queryClient.clear();
  },
  setUser: (user) => set({ user }),
}));

setSessionLostHandler(() => {
  if (useAuth.getState().user) {
    useAuth.setState({ user: null });
    queryClient.clear();
    toast.info('Your session has expired. Please sign in again.');
  }
});
