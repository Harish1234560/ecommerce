import { ApiError } from '@/api/client';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retry transient failures only — never 4xx responses.
      retry: (count, error) => (error instanceof ApiError && error.status > 0 && error.status < 500 ? false : count < 2),
    },
    mutations: { retry: false },
  },
});
