import { PageSpinner } from '@/components/ui/Feedback';
import { useAuth } from '@/store/auth';
import { safeRedirect } from '@/utils/redirect';
import { Navigate, useSearchParams } from 'react-router-dom';

export function useRedirectIfSignedIn() {
  const { user, status } = useAuth();
  const [params] = useSearchParams();
  if (status === 'loading') return <PageSpinner />;
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : safeRedirect(params.get('redirect'))} replace />;
  return null;
}
