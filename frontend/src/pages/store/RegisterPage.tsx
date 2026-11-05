import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { fieldErrors, Input } from '@/components/ui/Form';
import { useRedirectIfSignedIn } from '@/hooks/useRedirectIfSignedIn';
import { useSeo } from '@/hooks/useSeo';
import { AuthShell } from '@/sections/auth/AuthShell';
import { PasswordInput } from '@/sections/auth/PasswordInput';
import { toast } from '@/store/toast';
import { useAuth } from '@/store/auth';
import { safeRedirect } from '@/utils/redirect';
import { isValidEmail, isValidPhone } from '@/utils/validation';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function RegisterPage() {
  useSeo({ title: 'Create Account', noindex: true });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const register = useAuth((s) => s.register);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const redirecting = useRedirectIfSignedIn();
  if (redirecting && !busy) return redirecting;
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name';
    if (!isValidEmail(form.email)) next.email = 'Enter a valid email address';
    if (form.phone && !isValidPhone(form.phone)) next.phone = 'Enter a valid 10-digit Indian mobile number';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) next.password = 'At least 8 characters with a letter and a number';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const user = await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone || undefined, password: form.password });
      toast.success(`Welcome, ${user.name.split(' ')[0]}! Your account is ready.`);
      navigate(safeRedirect(params.get('redirect')), { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  const redirect = params.get('redirect');
  return (
    <AuthShell title="Create your account" subtitle="It takes less than a minute." footer={<>Already have an account? <Link to={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-semibold text-brand-700 hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Input label="Full name" required autoComplete="name" value={form.name} onChange={(e) => set('name')(e.target.value)} error={errors.name} />
        <Input label="Email" required type="email" autoComplete="email" value={form.email} onChange={(e) => set('email')(e.target.value)} error={errors.email} placeholder="you@example.com" />
        <Input label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone')(e.target.value)} error={errors.phone} placeholder="10-digit mobile number (optional)" />
        <PasswordInput label="Password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters with a letter and a number" />
        <PasswordInput label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" size="lg" block loading={busy}>Create account</Button>
        <p className="text-center text-xs leading-5 text-stone-500">By creating an account you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
      </form>
    </AuthShell>
  );
}
