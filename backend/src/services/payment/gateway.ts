import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

// Payment gateway abstraction. The real provider is Razorpay (UPI, cards, net banking, wallets).
// The mock provider speaks the same protocol (HMAC-signed checkout response + signed webhooks)
// so the whole order → pay → verify → webhook flow can be exercised without real money.
// Card numbers, CVVs and PINs never touch this server — the gateway's own checkout collects them.

export interface GatewayOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface GatewayPayment {
  id: string;
  orderId: string;
  amount: number;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
  method: string | null;
  reference: string | null;
}

export interface GatewayRefund {
  id: string;
  status: 'pending' | 'processed' | 'failed';
  amount: number;
}

export interface PaymentGatewayProvider {
  name: 'RAZORPAY' | 'MOCK';
  publicKey: string;
  createOrder(amount: number, receipt: string, notes: Record<string, string>): Promise<GatewayOrder>;
  verifyCheckoutSignature(gatewayOrderId: string, gatewayPaymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  fetchPayment(gatewayPaymentId: string): Promise<GatewayPayment>;
  capturePayment(gatewayPaymentId: string, amount: number): Promise<GatewayPayment>;
  createRefund(gatewayPaymentId: string, amount: number, notes: Record<string, string>): Promise<GatewayRefund>;
}

export function hmacHex(secret: string, data: string | Buffer): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// ───────────────────────── Razorpay ─────────────────────────

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  status: GatewayPayment['status'];
  method?: string;
  acquirer_data?: { rrn?: string; upi_transaction_id?: string; bank_transaction_id?: string; auth_code?: string };
}

export function paymentFromEntity(e: RazorpayPaymentEntity): GatewayPayment {
  const a = e.acquirer_data ?? {};
  return {
    id: e.id,
    orderId: e.order_id,
    amount: e.amount,
    status: e.status,
    method: e.method ?? null,
    reference: a.rrn ?? a.upi_transaction_id ?? a.bank_transaction_id ?? a.auth_code ?? null,
  };
}

class RazorpayGateway implements PaymentGatewayProvider {
  name = 'RAZORPAY' as const;
  publicKey = env.RAZORPAY_KEY_ID ?? '';
  private auth = 'Basic ' + Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: { Authorization: this.auth, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: { description?: string } };
    if (!res.ok) throw new ApiError(502, `Payment gateway error: ${json.error?.description ?? res.statusText}`);
    return json as T;
  }

  async createOrder(amount: number, receipt: string, notes: Record<string, string>) {
    const o = await this.call<{ id: string; amount: number; currency: string }>('POST', '/orders', {
      amount,
      currency: 'INR',
      receipt,
      notes,
    });
    return { id: o.id, amount: o.amount, currency: o.currency };
  }

  verifyCheckoutSignature(gatewayOrderId: string, gatewayPaymentId: string, signature: string) {
    return safeEqual(hmacHex(env.RAZORPAY_KEY_SECRET!, `${gatewayOrderId}|${gatewayPaymentId}`), signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string) {
    return safeEqual(hmacHex(env.RAZORPAY_WEBHOOK_SECRET!, rawBody), signature);
  }

  async fetchPayment(gatewayPaymentId: string) {
    return paymentFromEntity(await this.call<RazorpayPaymentEntity>('GET', `/payments/${encodeURIComponent(gatewayPaymentId)}`));
  }

  async capturePayment(gatewayPaymentId: string, amount: number) {
    return paymentFromEntity(
      await this.call<RazorpayPaymentEntity>('POST', `/payments/${encodeURIComponent(gatewayPaymentId)}/capture`, {
        amount,
        currency: 'INR',
      }),
    );
  }

  async createRefund(gatewayPaymentId: string, amount: number, notes: Record<string, string>) {
    const r = await this.call<{ id: string; status: GatewayRefund['status']; amount: number }>(
      'POST',
      `/payments/${encodeURIComponent(gatewayPaymentId)}/refund`,
      { amount, notes },
    );
    return { id: r.id, status: r.status, amount: r.amount };
  }
}

// ───────────────────────── Mock (test) gateway ─────────────────────────

const rid = (prefix: string) => `${prefix}_${randomBytes(9).toString('base64url')}`;

class MockGateway implements PaymentGatewayProvider {
  name = 'MOCK' as const;
  publicKey = 'mock_test_key';
  // Simulated gateway-side state (test mode only).
  payments = new Map<string, GatewayPayment>();

  async createOrder(amount: number) {
    return { id: rid('mockorder'), amount, currency: 'INR' };
  }

  sign(gatewayOrderId: string, gatewayPaymentId: string) {
    return hmacHex(env.MOCK_GATEWAY_SECRET, `${gatewayOrderId}|${gatewayPaymentId}`);
  }

  verifyCheckoutSignature(gatewayOrderId: string, gatewayPaymentId: string, signature: string) {
    return safeEqual(this.sign(gatewayOrderId, gatewayPaymentId), signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string) {
    return safeEqual(hmacHex(env.MOCK_GATEWAY_SECRET, rawBody), signature);
  }

  // Called by the simulator when the "customer" pays or the payment is declined.
  simulatePayment(gatewayOrderId: string, amount: number, method: string, success: boolean): GatewayPayment {
    const payment: GatewayPayment = {
      id: rid('mockpay'),
      orderId: gatewayOrderId,
      amount,
      status: success ? 'captured' : 'failed',
      method,
      reference: success ? `TEST${Date.now()}` : null,
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  async fetchPayment(gatewayPaymentId: string) {
    const payment = this.payments.get(gatewayPaymentId);
    if (!payment) throw new ApiError(404, 'Payment not found at the test gateway');
    return payment;
  }

  async capturePayment(gatewayPaymentId: string) {
    return this.fetchPayment(gatewayPaymentId);
  }

  async createRefund(gatewayPaymentId: string, amount: number) {
    const refund: GatewayRefund = { id: rid('mockrfnd'), status: 'pending', amount };
    // Like a real gateway, confirm asynchronously through a signed webhook.
    setTimeout(() => {
      void sendMockWebhook('refund.processed', {
        refund: { entity: { id: refund.id, payment_id: gatewayPaymentId, amount, status: 'processed' } },
      });
    }, 2000);
    return refund;
  }
}

// Delivers a signed webhook to this server's own webhook endpoint, exactly as an external gateway would.
export async function sendMockWebhook(event: string, payload: Record<string, unknown>, eventId = rid('evt')) {
  const body = JSON.stringify({ event, payload, created_at: Math.floor(Date.now() / 1000) });
  try {
    await fetch(`http://127.0.0.1:${env.PORT}/api/v1/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': hmacHex(env.MOCK_GATEWAY_SECRET, body),
        'x-razorpay-event-id': eventId,
      },
      body,
    });
  } catch (err) {
    logger.error('Mock gateway webhook delivery failed', err);
  }
}

export const mockGateway = new MockGateway();
export const gateway: PaymentGatewayProvider = env.PAYMENT_GATEWAY === 'razorpay' ? new RazorpayGateway() : mockGateway;
