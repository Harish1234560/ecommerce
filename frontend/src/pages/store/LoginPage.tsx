import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { useRedirectIfSignedIn } from '@/hooks/useRedirectIfSignedIn';
import { useSeo } from '@/hooks/useSeo';
import { AuthShell } from '@/sections/auth/AuthShell';
import { PasswordInput } from '@/sections/auth/PasswordInput';
import { toast } from '@/store/toast';
import { useAuth } from '@/store/auth';
import { safeRedirect } from '@/utils/redirect';
import { isValidEmail } from '@/utils/validation';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function LoginPage() {
  useSeo({ title: 'Sign In', noindex: true });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const redirecting = useRedirectIfSignedIn();
  if (redirecting && !busy) return redirecting;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!isValidEmail(email)) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(user.role === 'ADMIN' ? '/admin' : safeRedirect(params.get('redirect')), { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  const redirect = params.get('redirect');
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to track orders, manage your wishlist and check out faster." footer={<>New here? <Link to={`/register${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-semibold text-brand-700 hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{formError}</p>}
        <Input label="Email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="you@example.com" />
        <PasswordInput label="Password" autoComplete="current-password" value={password} onChange={setPassword} error={errors.password} />
        <div className="text-right"><Link to="/forgot-password" className="text-sm font-semibold text-brand-700 hover:underline">Forgot password?</Link></div>
        <Button type="submit" size="lg" block loading={busy}>Sign in</Button>
      </form>
    </AuthShell>
  );
}
