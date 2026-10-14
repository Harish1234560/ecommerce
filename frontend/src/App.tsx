import { Suspense, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queryClient';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { PageSpinner, Toaster } from '@/components/ui';
import { AppRoutes } from '@/routes/AppRoutes';
import { useAuth } from '@/store/auth';

export default function App() {
  const init = useAuth((s) => s.init);
  // Restore the session from the refresh cookie on page load.
  useEffect(() => {
    void init();
  }, [init]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <ErrorBoundary>
          <Suspense fallback={<PageSpinner />}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
