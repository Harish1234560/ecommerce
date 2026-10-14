import { PageSpinner } from '@/components/ui/Feedback';
import { AdminLayout } from '@/layouts/AdminLayout';
import { useAuth } from '@/store/auth';
import { ShieldAlert } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';

// Route guard. The API enforces the same rule on every /api/v1/admin request.
export function RequireAdmin() {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageSpinner />;
  if (!user) return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (user.role !== 'ADMIN') {
    return (
      <div className="admin flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-rose-500" />
        <h1 className="mt-4 font-sans text-2xl font-bold text-slate-900">Access denied</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">This area is for store administrators only. You are signed in as {user.email}.</p>
        <Link to="/" className="mt-6 text-sm font-semibold text-indigo-600 hover:underline">Back to the store</Link>
      </div>
    );
  }
  return <AdminLayout />;
}
