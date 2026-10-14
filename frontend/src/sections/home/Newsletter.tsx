import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { catalogService } from '@/services/catalogService';
import { toast } from '@/store/toast';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

export function Newsletter({ title, subtitle }: { title: string; subtitle?: string | null }) {
  const [email, setEmail] = useState('');
  const subscribe = useMutation({
    mutationFn: () => catalogService.subscribeNewsletter(email),
    onSuccess: () => {
      toast.success('You are subscribed. Watch your inbox for offers!');
      setEmail('');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    subscribe.mutate();
  };
  return (
    <section className="overflow-hidden rounded-3xl bg-brand-900 px-6 py-12 text-center sm:px-12">
      <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
      {subtitle && <p className="mx-auto mt-2 max-w-md text-sm text-brand-100/80">{subtitle}</p>}
      <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="h-12 flex-1 rounded-full border border-white/20 bg-white/10 px-5 text-sm text-white placeholder:text-brand-100/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
        />
        <Button type="submit" size="lg" loading={subscribe.isPending} className="rounded-full !bg-white !text-brand-900 hover:!bg-brand-50">
          Subscribe
        </Button>
      </form>
    </section>
  );
}
