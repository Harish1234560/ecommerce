import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { paymentService } from '@/services/orderService';
import type { GatewayCheckoutResponse as CheckoutResponse, OnlineMethod, PaymentSession } from '@/types';
import { money } from '@/utils/format';
import { CreditCard, FlaskConical, Landmark, Smartphone, Wallet } from 'lucide-react';
import { useCallback, useRef, useState, type ReactNode } from 'react';

export type PaymentResult = { status: 'paid' } | { status: 'failed'; message: string } | { status: 'cancelled' };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void };
  }
}

let razorpayScript: Promise<void> | null = null;

function loadRazorpay(): Promise<void> {
  razorpayScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => {
      razorpayScript = null;
      reject(new Error('Could not load the payment gateway. Check your connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return razorpayScript;
}

async function verify(resp: CheckoutResponse): Promise<PaymentResult> {
  try {
    await paymentService.verify(resp);
    return { status: 'paid' };
  } catch (err) {
    return { status: 'failed', message: errorMessage(err, 'We could not verify your payment') };
  }
}

const METHOD_META: Record<OnlineMethod, { label: string; icon: ReactNode }> = {
  upi: { label: 'UPI', icon: <Smartphone className="h-4 w-4" /> },
  card: { label: 'Card', icon: <CreditCard className="h-4 w-4" /> },
  netbanking: { label: 'Net Banking', icon: <Landmark className="h-4 w-4" /> },
  wallet: { label: 'Wallet', icon: <Wallet className="h-4 w-4" /> },
};

export function usePayment() {
  const [mock, setMock] = useState<{ session: PaymentSession; method: OnlineMethod } | null>(null);
  const [busy, setBusy] = useState<'success' | 'failure' | null>(null);
  const resolver = useRef<((r: PaymentResult) => void) | null>(null);

  const finish = (result: PaymentResult) => {
    setMock(null);
    setBusy(null);
    resolver.current?.(result);
    resolver.current = null;
  };

  const pay = useCallback(async (orderId: string, method: OnlineMethod): Promise<PaymentResult> => {
    let session: PaymentSession;
    try {
      session = await paymentService.createSession(orderId, method);
    } catch (err) {
      return { status: 'failed', message: errorMessage(err, 'Could not start the payment') };
    }

    if (session.gateway === 'MOCK') {
      return new Promise<PaymentResult>((resolve) => {
        resolver.current = resolve;
        setMock({ session, method });
      });
    }

    try {
      await loadRazorpay();
    } catch (err) {
      return { status: 'failed', message: errorMessage(err) };
    }
    return new Promise<PaymentResult>((resolve) => {
      let settled = false;
      const done = (r: PaymentResult) => {
        if (!settled) {
          settled = true;
          resolve(r);
        }
      };
      const rzp = new window.Razorpay!({
        key: session.keyId,
        amount: session.amount,
        currency: session.currency,
        name: session.storeName,
        description: `Order ${session.orderNumber}`,
        order_id: session.gatewayOrderId,
        prefill: { name: session.customer.name, email: session.customer.email, contact: session.customer.phone ?? '', method },
        theme: { color: '#1c1917' },
        handler: (resp: CheckoutResponse) => void verify(resp).then(done),
        modal: { ondismiss: () => done({ status: 'cancelled' }) },
      });
      rzp.on('payment.failed', (resp) => done({ status: 'failed', message: resp.error?.description ?? 'Payment failed' }));
      rzp.open();
    });
  }, []);

  const simulate = async (outcome: 'success' | 'failure') => {
    if (!mock) return;
    setBusy(outcome);
    try {
      const resp = await paymentService.simulate({ gatewayOrderId: mock.session.gatewayOrderId, method: mock.method, outcome });
      finish(await verify(resp));
    } catch (err) {
      finish({ status: 'failed', message: errorMessage(err, 'Payment failed') });
    }
  };

  const element = (
    <Modal open={!!mock} onClose={() => finish({ status: 'cancelled' })} title="Test payment gateway" size="sm" dismissable={!busy}>
      {mock && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 ring-1 ring-inset ring-amber-200">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Test mode.</strong> This store is using the built-in payment simulator — no real money moves. Set <code className="font-mono">PAYMENT_GATEWAY=razorpay</code> to accept real payments.
            </span>
          </div>
          <dl className="space-y-2 rounded-xl border border-stone-200 p-4 text-sm">
            <div className="flex justify-between"><dt className="text-stone-500">Order</dt><dd className="font-medium">{mock.session.orderNumber}</dd></div>
            <div className="flex justify-between"><dt className="text-stone-500">Paying with</dt><dd className="flex items-center gap-1.5 font-medium">{METHOD_META[mock.method].icon}{METHOD_META[mock.method].label}</dd></div>
            <div className="flex justify-between border-t border-stone-200 pt-2"><dt className="font-semibold">Amount</dt><dd className="text-lg font-bold">{money(mock.session.amount)}</dd></div>
          </dl>
          <div className="space-y-2">
            <Button block variant="brand" loading={busy === 'success'} disabled={!!busy} onClick={() => void simulate('success')}>Simulate successful payment</Button>
            <Button block variant="outline" loading={busy === 'failure'} disabled={!!busy} onClick={() => void simulate('failure')}>Simulate failed payment</Button>
            <Button block variant="ghost" disabled={!!busy} onClick={() => finish({ status: 'cancelled' })}>Cancel payment</Button>
          </div>
        </div>
      )}
    </Modal>
  );

  return { pay, element };
}
