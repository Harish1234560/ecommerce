import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { useSeo } from '@/hooks/useSeo';
import { AuthShell } from '@/sections/auth/AuthShell';
import { authService } from '@/services/authService';
import { isValidEmail } from '@/utils/validation';
import { useMutation } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

export function ForgotPasswordPage() {
  useSeo({ title: 'Forgot Password', noindex: true });
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const request = useMutation({ mutationFn: () => authService.forgotPassword(email.trim()), onError: (err) => setError(errorMessage(err)) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return setError('Enter a valid email address');
    setError('');
    request.mutate();
  };

  if (request.isSuccess) {
    return (
      <AuthShell title="Check your email" subtitle={`If an account exists for ${email.trim()}, we have sent a link to reset your password. It is valid for 30 minutes.`} footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>}>
        <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900"><MailCheck className="h-6 w-6 shrink-0 text-brand-700" /> Did not get it? Check your spam folder or try again in a few minutes.</div>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we will send you a link to choose a new one." footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Input label="Email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} placeholder="you@example.com" />
        <Button type="submit" size="lg" block loading={request.isPending}>Send reset link</Button>
      </form>
    </AuthShell>
  );
}
