import { errorMessage } from '@/api/client';
import { clsx } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { money } from '@/utils/format';
import { Tag, X } from 'lucide-react';
import { useState } from 'react';

export function CouponBox({ pincode }: { pincode?: string | null }) {
  const { cart, applyCoupon, removeCoupon } = useCart(pincode);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Tag className="h-4 w-4 shrink-0 text-emerald-700" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-800">{cart.coupon.code} applied</p>
            <p className="truncate text-xs text-emerald-700">You save {money(cart.summary.couponDiscount)}</p>
          </div>
        </div>
        <button onClick={() => removeCoupon.mutate()} aria-label="Remove coupon" className="rounded-full p-1 text-emerald-700 hover:bg-emerald-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setError(null);
        applyCoupon.mutate(code.trim(), { onSuccess: () => setCode(''), onError: (err) => setError(errorMessage(err)) });
      }}
    >
      <label htmlFor="coupon" className="mb-1.5 block text-sm font-medium text-stone-700">
        Have a coupon?
      </label>
      <div className="flex gap-2">
        <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter code" className={clsx('field uppercase placeholder:normal-case', (error || cart.couponError) && 'field-error')} autoComplete="off" />
        <Button type="submit" variant="outline" loading={applyCoupon.isPending} disabled={!code.trim()}>
          Apply
        </Button>
      </div>
      {(error || cart.couponError) && (
        <p role="alert" className="mt-1.5 text-xs text-rose-600">
          {error ?? cart.couponError}
        </p>
      )}
    </form>
  );
}
