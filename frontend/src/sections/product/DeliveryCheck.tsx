import { errorMessage } from '@/api/client';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { catalogService } from '@/services/catalogService';
import { toast } from '@/store/toast';
import { formatDate, money } from '@/utils/format';
import { isValidPincode } from '@/utils/validation';
import { useMutation } from '@tanstack/react-query';
import { Check, MapPin, Truck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

export function DeliveryCheck({ productAvailable }: { productAvailable: boolean }) {
  const [pin, setPin] = useState(() => localStorage.getItem('pincode') ?? '');
  const check = useMutation({
    mutationFn: (pincode: string) => catalogService.checkDelivery(pincode),
    onSuccess: (_d, pincode) => localStorage.setItem('pincode', pincode),
  });
  useEffect(() => {
    if (isValidPincode(pin)) check.mutate(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidPincode(pin)) return toast.error('Enter a valid 6-digit PIN code');
    check.mutate(pin);
  };
  const d = check.data;
  return (
    <div className="rounded-2xl border border-stone-200 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-stone-900"><MapPin className="h-4 w-4 text-stone-500" /> Check delivery</p>
      <form onSubmit={submit} className="mt-2.5 flex gap-2">
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="Enter PIN code" aria-label="PIN code" className="field !py-2" />
        <Button type="submit" variant="outline" size="sm" className="h-auto" loading={check.isPending}>Check</Button>
      </form>
      {check.error && <p className="mt-2 text-xs text-rose-600">{errorMessage(check.error)}</p>}
      {d && !d.deliverable && <p className="mt-2.5 text-sm text-rose-600">Sorry, we do not deliver to this PIN code yet.</p>}
      {d && d.deliverable && (
        <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
          {productAvailable && (
            <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-brand-600" /> Delivery by <strong>{formatDate(d.estimatedTo, { weekday: 'short', day: 'numeric', month: 'short' })}</strong></li>
          )}
          <li className="flex items-center gap-2 text-stone-600">
            <Check className="h-4 w-4 text-brand-600" />
            {d.freeAbove != null ? `Free delivery above ${money(d.freeAbove)}, otherwise ${money(d.fee)}` : d.fee > 0 ? `Delivery fee ${money(d.fee)}` : 'Free delivery'}
          </li>
          <li className="flex items-center gap-2 text-stone-600"><Check className={clsx('h-4 w-4', d.codAvailable ? 'text-brand-600' : 'text-stone-300')} /> Cash on Delivery {d.codAvailable ? 'available' : 'not available'}</li>
        </ul>
      )}
    </div>
  );
}
