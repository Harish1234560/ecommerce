import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { fieldErrors } from '@/components/ui/Form';
import { useSeo } from '@/hooks/useSeo';
import { AuthShell } from '@/sections/auth/AuthShell';
import { PasswordInput } from '@/sections/auth/PasswordInput';
import { authService } from '@/services/authService';
import { toast } from '@/store/toast';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function ResetPasswordPage() {
  useSeo({ title: 'Reset Password', noindex: true });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const reset = useMutation({
    mutationFn: () => authService.resetPassword(token, password),
    onSuccess: () => {
      toast.success('Password updated. Please sign in with your new password.');
      navigate('/login', { replace: true });
    },
    onError: (err) => setErrors({ form: errorMessage(err), ...fieldErrors(err) }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) next.password = 'At least 8 characters with a letter and a number';
    if (confirm !== password) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length === 0) reset.mutate();
  };

  if (!token) {
    return (
      <AuthShell title="Reset link missing" subtitle="This page needs the link from your password reset email." footer={<Link to="/forgot-password" className="font-semibold text-brand-700 hover:underline">Request a new link</Link>}>
        <span />
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password" subtitle="You will be signed out of all devices after the change." footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{errors.form} {errors.form.includes('expired') && <Link to="/forgot-password" className="underline">Request a new link</Link>}</p>}
        <PasswordInput label="New password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint="At least 8 characters with a letter and a number" />
        <PasswordInput label="Confirm new password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
        <Button type="submit" size="lg" block loading={reset.isPending}>Update password</Button>
      </form>
    </AuthShell>
  );
}
