import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Form';
import { useSeo } from '@/hooks/useSeo';
import { useAuth } from '@/store/auth';
import { ShoppingBag } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

export function AdminLoginPage() {
  useSeo({ title: 'Admin Sign In', noindex: true });
  const { user, status, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const target = new URLSearchParams(location.search).get('redirect');
  const dest = target && target.startsWith('/admin') ? target : '/admin';

  if (status === 'loading') return <PageSpinner />;
  if (user?.role === 'ADMIN' && !busy) return <Navigate to={dest} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role !== 'ADMIN') {
        await logout();
        setError('This account does not have admin access.');
        setBusy(false);
        return;
      }
      navigate(dest, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="admin flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white"><ShoppingBag className="h-5 w-5" /></span>
        <h1 className="mt-5 font-sans text-xl font-bold text-slate-900">Admin sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Manage products, orders and store settings.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
          <Input label="Email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" block loading={busy}>Sign in</Button>
        </form>
        <Link to="/" className="mt-5 block text-center text-sm text-slate-500 hover:text-slate-800">← Back to the store</Link>
      </div>
    </div>
  );
}
