import { useSettings } from '@/hooks/useSettings';
import { CheckCircle2, ShieldCheck, Truck } from 'lucide-react';
import { type ReactNode } from 'react';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  const { data: settings } = useSettings();
  return (
    <div className="container-page grid max-w-5xl gap-10 py-8 lg:grid-cols-2 lg:py-16">
      <div className="hidden flex-col justify-center rounded-3xl bg-brand-900 p-10 text-white lg:flex">
        <h2 className="text-3xl font-extrabold leading-tight">Shopping made simple at {settings?.store.name ?? 'ShopHub'}</h2>
        <ul className="mt-8 space-y-5 text-sm text-brand-50">
          <li className="flex items-start gap-3"><Truck className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" /> Track every order from checkout to your door</li>
          <li className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" /> Secure payments with UPI, cards, net banking and COD</li>
          <li className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" /> Save addresses and favourites for faster checkout</li>
        </ul>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col justify-center">
        <h1 className="text-3xl font-bold text-stone-900">{title}</h1>
        <p className="mt-2 text-sm text-stone-500">{subtitle}</p>
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-stone-600">{footer}</div>}
      </div>
    </div>
  );
}
