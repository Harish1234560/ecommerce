import { PageSpinner } from '@/components/ui/Feedback';
import { useAuth } from '@/store/auth';
import { type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// Gate for pages that need a signed-in user. Remembers where the visitor was heading.
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageSpinner />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children ?? <Outlet />}</>;
}
