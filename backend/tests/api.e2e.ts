// End-to-end API tests: the full customer journey, the admin order flow and the edge cases,
// exercised over HTTP against a real server and database with the test payment gateway.
// Run with `npm test` (see tests/run.ts, which prepares an isolated test database).
import { createHash, createHmac } from 'node:crypto';
import { prisma } from '../src/database/prisma.js';
import { expireStalePendingOrders } from '../src/services/order.service.js';

const BASE = `http://127.0.0.1:${process.env.PORT ?? 4000}`;
const SECRET = process.env.MOCK_GATEWAY_SECRET ?? '';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: unknown, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}${detail !== undefined ? `  →  ${JSON.stringify(detail)?.slice(0, 300)}` : ''}`);
  }
}
const section = (title: string) => console.log(`\n${title}`);

// Response bodies are untyped JSON; the assertions in this file are what check their shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
interface Res { status: number; body: Json; headers: Headers }
async function api(method: string, path: string, opts: { token?: string; body?: unknown; headers?: Record<string, string>; raw?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined || opts.raw !== undefined) headers['Content-Type'] ??= 'application/json';
  const res = await fetch(`${BASE}${path}`, { method, headers, body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined) });
  const type = res.headers.get('content-type') ?? '';
  const body = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, body, headers: res.headers };
}

async function webhook(event: string, payload: object, eventId: string, secret = SECRET): Promise<Res> {
  const raw = JSON.stringify({ event, payload });
  return api('POST', '/api/v1/payments/webhook', {
    raw,
    headers: { 'x-razorpay-signature': createHmac('sha256', secret).update(raw).digest('hex'), 'x-razorpay-event-id': eventId },
  });
}

const stamp = Date.now().toString(36);
const email = `e2e.${stamp}@example.com`;
const password = 'Test@12345';

export async function runApiTests(): Promise<number> {
  // ───────────────────────── Catalogue ─────────────────────────
  section('Catalogue & search');
  check('health endpoint', (await api('GET', '/api/v1/health')).status === 200);
  const list = await api('GET', '/api/v1/products?limit=5');
  check('products are paginated', list.status === 200 && list.body.data.length === 5 && list.body.meta.total >= 24, list.body.meta);
  const search = await api('GET', '/api/v1/products?q=sneakers&sort=price_asc');
  const prices: number[] = search.body.data.map((p: Json) => p.sellingPrice);
  check('search finds sneakers', search.body.data.length >= 4 && search.body.data.every((p: Json) => /sneaker/i.test(p.name)));
  check('sort by price ascending', prices.every((p, i) => i === 0 || prices[i - 1]! <= p), prices);
  const filtered = await api('GET', '/api/v1/products?category=beauty&maxPrice=1500');
  check('category + price filter', filtered.body.data.length > 0 && filtered.body.data.every((p: Json) => p.category.slug === 'beauty' && p.sellingPrice <= 150000));
  check('empty search returns no results', (await api('GET', '/api/v1/products?q=zzzznotathing')).body.data.length === 0);
  const missing = await api('GET', '/api/v1/products/does-not-exist');
  check('invalid product → 404 with consistent error body', missing.status === 404 && missing.body.success === false && typeof missing.body.message === 'string' && typeof missing.body.error === 'object', missing.body);
  const home = await api('GET', '/api/v1/home');
  check('home data', home.body.data.banners.hero.length > 0 && home.body.data.featured.length > 0 && home.body.data.categories.length === 6);
  check('delivery check (valid PIN)', (await api('GET', '/api/v1/delivery/check?pincode=400001')).body.data.deliverable === true);
  check('delivery check (invalid PIN) → 400', (await api('GET', '/api/v1/delivery/check?pincode=12')).status === 400);
  check('sitemap.xml', (await api('GET', '/sitemap.xml')).status === 200);

  const bySlug = async (slug: string) => (await api('GET', `/api/v1/products/${slug}`)).body.data;
  const cream = await bySlug('luxury-face-cream');
  const serum = await bySlug('vitamin-c-serum');
  const tee = await bySlug('casual-cotton-t-shirt');
  const cabinet = await bySlug('storage-cabinet');
  const stand = await bySlug('smart-laptop-stand');
  check('product detail has variants, related and reviews', tee.variants.length === 4 && cream.related.length > 0 && cream.ratingCount > 0);

  // ───────────────────────── Auth ─────────────────────────
  section('Authentication & roles');
  const weak = await api('POST', '/api/v1/auth/register', { body: { name: 'E2E Tester', email, password: 'short' } });
  check('weak password rejected with field errors', weak.status === 400 && !!weak.body.error?.fields?.password, weak.body);
  const reg = await api('POST', '/api/v1/auth/register', { body: { name: 'E2E Tester', email, password } });
  check('register', reg.status === 201 && !!reg.body.data.accessToken && reg.body.data.user.role === 'CUSTOMER', reg.body);
  const cookie = reg.headers.get('set-cookie') ?? '';
  check('refresh cookie is httpOnly + SameSite=Strict', /HttpOnly/i.test(cookie) && /SameSite=Strict/i.test(cookie), cookie);
  check('duplicate email → 409', (await api('POST', '/api/v1/auth/register', { body: { name: 'Dup', email, password } })).status === 409);
  check('wrong password → 401', (await api('POST', '/api/v1/auth/login', { body: { email, password: 'Wrong@12345' } })).status === 401);
  const login = await api('POST', '/api/v1/auth/login', { body: { email, password } });
  const token: string = login.body.data.accessToken;
  check('login', login.status === 200 && !!token);
  check('/me with token', (await api('GET', '/api/v1/auth/me', { token })).body.data.email === email);
  check('/me without token → 401', (await api('GET', '/api/v1/auth/me')).status === 401);
  const refreshed = await api('POST', '/api/v1/auth/refresh', { headers: { Cookie: cookie.split(';')[0]! } });
  check('session refresh via cookie', refreshed.status === 200 && !!refreshed.body.data.accessToken, refreshed.body);
  check('customer cannot access admin API → 403', (await api('GET', '/api/v1/admin/dashboard', { token })).status === 403);
  check('anonymous cannot access admin API → 401', (await api('GET', '/api/v1/admin/dashboard')).status === 401);
  check('forgot-password does not reveal accounts', (await api('POST', '/api/v1/auth/forgot-password', { body: { email: 'nobody@example.com' } })).status === 200);
  check('reset with invalid token → 400', (await api('POST', '/api/v1/auth/reset-password', { body: { token: 'x'.repeat(40), password } })).status === 400);
  // Password reset: the emailed token is single-use, expires, and signs out existing sessions.
  const resetToken = `e2e-reset-${stamp}-${'x'.repeat(20)}`;
  const me0 = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.passwordResetToken.create({ data: { userId: me0.id, tokenHash: createHash('sha256').update(resetToken).digest('hex'), expiresAt: new Date(Date.now() + 600_000) } });
  check('reset password with a valid token', (await api('POST', '/api/v1/auth/reset-password', { body: { token: resetToken, password } })).status === 200);
  check('reset token cannot be reused', (await api('POST', '/api/v1/auth/reset-password', { body: { token: resetToken, password } })).status === 400);
  check('reset signs out existing sessions', (await api('POST', '/api/v1/auth/refresh', { headers: { Cookie: cookie.split(';')[0]! } })).status === 401);
  check('session check answers 200/null for visitors', (await api('GET', '/api/v1/auth/session')).body.data === null);

  const adminLogin = await api('POST', '/api/v1/auth/login', { body: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD } });
  const admin: string = adminLogin.body.data?.accessToken;
  check('admin login', adminLogin.status === 200 && adminLogin.body.data.user.role === 'ADMIN', adminLogin.body);
  check('admin dashboard', (await api('GET', '/api/v1/admin/dashboard?range=30d', { token: admin })).status === 200);

  // ───────────────────────── Cart, wishlist, coupons ─────────────────────────
  section('Cart, wishlist & coupons');
  const quote = await api('POST', '/api/v1/cart/quote', { body: { items: [{ productId: cream.id, quantity: 2, price: 1 }] } });
  check('guest quote prices from the database (client price ignored)', quote.body.data.summary.subtotal === cream.sellingPrice * 2, quote.body.data?.summary);
  let cart = await api('POST', '/api/v1/cart/items', { token, body: { productId: cream.id, quantity: 1 } });
  check('add to cart', cart.status === 200 && cart.body.data.items.length === 1, cart.body);
  check('variant required', (await api('POST', '/api/v1/cart/items', { token, body: { productId: tee.id, quantity: 1 } })).body.error?.code === 'VARIANT_REQUIRED');
  check('out-of-stock product rejected', (await api('POST', '/api/v1/cart/items', { token, body: { productId: cabinet.id, quantity: 1 } })).body.error?.code === 'OUT_OF_STOCK');
  check('quantity above stock rejected', (await api('POST', '/api/v1/cart/items', { token, body: { productId: stand.id, quantity: 10 } })).body.error?.code === 'INSUFFICIENT_STOCK');
  check('invalid product id rejected', (await api('POST', '/api/v1/cart/items', { token, body: { productId: 'nope', quantity: 1 } })).status === 409);
  cart = await api('POST', '/api/v1/cart/items', { token, body: { productId: tee.id, variantId: tee.variants[0].id, quantity: 2 } });
  check('add variant item', cart.body.data.items.length === 2);
  const creamLine = cart.body.data.items.find((i: Json) => i.productId === cream.id);
  cart = await api('PATCH', `/api/v1/cart/items/${creamLine.id}`, { token, body: { quantity: 2 } });
  const expected = cream.sellingPrice * 2 + tee.variants[0].sellingPrice * 2;
  check('quantity update recalculates totals', cart.body.data.summary.subtotal === expected, cart.body.data.summary);
  cart = await api('PATCH', `/api/v1/cart/items/${creamLine.id}`, { token, body: { savedForLater: true } });
  check('save for later', cart.body.data.saved.length === 1 && cart.body.data.items.length === 1);
  cart = await api('PATCH', `/api/v1/cart/items/${creamLine.id}`, { token, body: { savedForLater: false } });
  check('move back to cart', cart.body.data.saved.length === 0 && cart.body.data.items.length === 2);
  check('invalid coupon → 400', (await api('POST', '/api/v1/cart/coupon', { token, body: { code: 'NOPE' } })).status === 400);
  const expired = await api('POST', '/api/v1/cart/coupon', { token, body: { code: 'SUMMER25' } });
  check('expired coupon rejected', expired.status === 400 && /expired/i.test(expired.body.message), expired.body);
  cart = await api('POST', '/api/v1/cart/coupon', { token, body: { code: 'welcome10' } });
  check('valid coupon applied (10% capped at ₹100)', cart.body.data.summary.couponDiscount === 10000, cart.body.data?.summary);

  await api('POST', '/api/v1/wishlist', { token, body: { productId: serum.id } });
  check('wishlist add', (await api('GET', '/api/v1/wishlist/ids', { token })).body.data.includes(serum.id));
  check('wishlist move to cart', (await api('POST', `/api/v1/wishlist/${serum.id}/move-to-cart`, { token })).status === 200);
  cart = await api('GET', '/api/v1/cart', { token });
  check('cart has wishlist item, wishlist is empty', cart.body.data.items.length === 3 && (await api('GET', '/api/v1/wishlist', { token })).body.data.length === 0);
  check('wishlist requires login', (await api('GET', '/api/v1/wishlist')).status === 401);

  // ───────────────────────── Address ─────────────────────────
  section('Addresses');
  const badAddr = await api('POST', '/api/v1/addresses', { token, body: { fullName: 'E2E', phone: '12345', address: '221B Baker Street', city: 'Mumbai', state: 'Maharashtra', pincode: '0001' } });
  check('invalid phone & PIN rejected', badAddr.status === 400 && !!badAddr.body.error?.fields?.phone && !!badAddr.body.error?.fields?.pincode, badAddr.body);
  const addr = await api('POST', '/api/v1/addresses', { token, body: { fullName: 'E2E Tester', phone: '+91 98200 12345', address: '221B Baker Street', apartment: 'Flat 4', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', landmark: 'Near Gateway' } });
  check('address created as default, phone normalised', addr.status === 201 && addr.body.data.isDefault && addr.body.data.phone === '9820012345', addr.body);
  const addressId: string = addr.body.data.id;

  // ───────────────────────── COD order + admin fulfilment ─────────────────────────
  section('Checkout (Cash on Delivery) → admin fulfilment');
  check('order without address → 400', (await api('POST', '/api/v1/orders', { token, body: { paymentMethod: 'COD' } })).status === 400);
  const invBefore = await prisma.inventory.findFirstOrThrow({ where: { productId: cream.id, variantId: null } });
  const key = `e2e-${stamp}-cod`;
  const placed = await api('POST', '/api/v1/orders', { token, body: { addressId, paymentMethod: 'COD' }, headers: { 'Idempotency-Key': key } });
  check('place COD order', placed.status === 201 && placed.body.data.requiresPayment === false, placed.body);
  const codId: string = placed.body.data.id;
  const again = await api('POST', '/api/v1/orders', { token, body: { addressId, paymentMethod: 'COD' }, headers: { 'Idempotency-Key': key } });
  check('same Idempotency-Key returns the same order (no duplicate)', again.body.data.id === codId);
  check('cart is emptied', (await api('GET', '/api/v1/cart', { token })).body.data.items.length === 0);
  let inv = await prisma.inventory.findUniqueOrThrow({ where: { id: invBefore.id } });
  check('stock is reserved, not yet deducted', inv.reserved === invBefore.reserved + 2 && inv.stock === invBefore.stock, inv);
  let order = (await api('GET', `/api/v1/orders/${codId}`, { token })).body.data;
  const expectTotal = cart.body.data.summary.total;
  check('order totals computed server-side', order.total === expectTotal && order.couponDiscount === 10000 && order.status === 'PENDING', { total: order.total, expectTotal });
  check("another customer cannot read the order → 404", (await api('GET', `/api/v1/orders/${codId}`, { token: admin })).status === 404);

  await api('POST', '/api/v1/cart/items', { token, body: { productId: cream.id, quantity: 1 } });
  const reuse = await api('POST', '/api/v1/cart/coupon', { token, body: { code: 'WELCOME10' } });
  check('per-user coupon limit enforced', reuse.status === 400 && /already used/i.test(reuse.body.message), reuse.body);
  await api('DELETE', '/api/v1/cart', { token });

  const setStatus = (id: string, status: string, extra: object = {}) => api('POST', `/api/v1/admin/orders/${id}/status`, { token: admin, body: { status, ...extra } });
  check('admin sees the order', (await api('GET', `/api/v1/admin/orders?q=${order.orderNumber}`, { token: admin })).body.data.length === 1);
  check('admin: confirm', (await setStatus(codId, 'CONFIRMED')).status === 200);
  inv = await prisma.inventory.findUniqueOrThrow({ where: { id: invBefore.id } });
  check('confirming deducts stock and clears the reservation', inv.stock === invBefore.stock - 2 && inv.reserved === invBefore.reserved, inv);
  check('admin: invalid transition rejected', (await setStatus(codId, 'DELIVERED')).status === 409);
  check('admin: pack', (await setStatus(codId, 'PACKED')).status === 200);
  check('admin: ship', (await setStatus(codId, 'SHIPPED', { courier: 'BlueDart', trackingNumber: 'BD123456' })).status === 200);
  check('customer can no longer cancel a shipped order', (await api('POST', `/api/v1/orders/${codId}/cancel`, { token, body: { reason: 'Changed my mind' } })).status === 409);
  check('admin: out for delivery', (await setStatus(codId, 'OUT_FOR_DELIVERY')).status === 200);
  check('admin: delivered', (await setStatus(codId, 'DELIVERED')).status === 200);
  order = (await api('GET', `/api/v1/orders/${codId}`, { token })).body.data;
  check('delivered: COD marked paid, timeline complete', order.status === 'DELIVERED' && order.paymentStatus === 'PAID' && order.history.length === 6 && order.trackingNumber === 'BD123456', order.history?.map((h: Json) => h.status));
  await sleep(500);
  const notes = (await api('GET', '/api/v1/notifications', { token })).body;
  check('customer notified along the way', notes.data.some((n: Json) => /shipped/i.test(n.title)) && notes.data.some((n: Json) => /delivered/i.test(n.title)) && notes.meta.unreadCount > 0);
  const invoice = await api('GET', `/api/v1/orders/${codId}/invoice`, { token });
  check('invoice PDF download', invoice.status === 200 && invoice.body.subarray(0, 4).toString() === '%PDF');

  section('Reviews');
  const rev = await api('POST', '/api/v1/reviews', { token, body: { productId: cream.id, rating: 5, title: 'Great', comment: 'Really nice cream, absorbs quickly.' } });
  check('verified purchaser can review', rev.status === 201, rev.body);
  check('duplicate review → 409', (await api('POST', '/api/v1/reviews', { token, body: { productId: cream.id, rating: 4, comment: 'Second review attempt here.' } })).status === 409);
  check('cannot review a product not purchased → 403', (await api('POST', '/api/v1/reviews', { token, body: { productId: stand.id, rating: 4, comment: 'Never bought this product.' } })).status === 403);
  check('rating summary updated', (await bySlug('luxury-face-cream')).ratingCount === cream.ratingCount + 1);

  section('Return → refund (COD, manual refund)');
  const creamItem = order.items.find((i: Json) => i.productId === cream.id);
  const ret = await api('POST', `/api/v1/orders/${codId}/return`, { token, body: { reason: 'Not what I expected', items: [{ orderItemId: creamItem.id, quantity: 1 }] } });
  check('return requested for one unit', ret.status === 201 && ret.body.data.amount > 0, ret.body);
  const refundId: string = ret.body.data.id;
  check('second return while one is open → 409', (await api('POST', `/api/v1/orders/${codId}/return`, { token, body: { reason: 'Again please' } })).status === 409);
  check('cannot process before approval', (await api('POST', `/api/v1/admin/refunds/${refundId}/process`, { token: admin, body: { reference: 'X' } })).status === 409);
  check('admin approves return', (await api('POST', `/api/v1/admin/refunds/${refundId}/approve`, { token: admin, body: {} })).status === 200);
  check('cannot refund before items are received', (await api('POST', `/api/v1/admin/refunds/${refundId}/process`, { token: admin, body: { reference: 'X' } })).status === 409);
  const stockBeforeReturn = (await prisma.inventory.findUniqueOrThrow({ where: { id: invBefore.id } })).stock;
  check('admin marks items received', (await api('POST', `/api/v1/admin/refunds/${refundId}/received`, { token: admin })).status === 200);
  check('returned unit is restocked', (await prisma.inventory.findUniqueOrThrow({ where: { id: invBefore.id } })).stock === stockBeforeReturn + 1);
  check('manual refund requires a reference', (await api('POST', `/api/v1/admin/refunds/${refundId}/process`, { token: admin, body: {} })).status === 400);
  const manual = await api('POST', `/api/v1/admin/refunds/${refundId}/process`, { token: admin, body: { reference: 'UPI-REF-778899' } });
  check('manual refund recorded as completed', manual.body.data?.status === 'COMPLETED', manual.body);
  order = (await api('GET', `/api/v1/orders/${codId}`, { token })).body.data;
  check('order refunded, payment partially refunded', order.status === 'REFUNDED' && order.paymentStatus === 'PARTIALLY_REFUNDED', { s: order.status, p: order.paymentStatus });

  // ───────────────────────── Online payments ─────────────────────────
  section('Online payment (mock gateway): failure, retry, verification, webhooks');
  const newOnlineOrder = async (productId: string, quantity = 1) => {
    await api('DELETE', '/api/v1/cart', { token });
    await api('POST', '/api/v1/cart/items', { token, body: { productId, quantity } });
    const o = await api('POST', '/api/v1/orders', { token, body: { addressId, paymentMethod: 'ONLINE' } });
    const p = await api('POST', '/api/v1/payments/create', { token, body: { orderId: o.body.data.id, method: 'upi' } });
    return { id: o.body.data.id as string, total: o.body.data.total as number, pay: p.body.data, res: o };
  };
  const serumInv = await prisma.inventory.findFirstOrThrow({ where: { productId: serum.id, variantId: null } });

  const o1 = await newOnlineOrder(serum.id);
  check('online order awaits payment', o1.res.status === 201 && o1.res.body.data.requiresPayment === true);
  check('gateway order amount comes from the server', o1.pay.amount === o1.total && !!o1.pay.gatewayOrderId, o1.pay);
  const fake = await api('POST', '/api/v1/payments/verify', { token, body: { razorpay_order_id: o1.pay.gatewayOrderId, razorpay_payment_id: 'pay_fake', razorpay_signature: 'deadbeef' } });
  check('forged payment success is rejected', fake.status === 400 && fake.body.error?.code === 'INVALID_SIGNATURE', fake.body);
  check('order still unpaid after forged success', (await api('GET', `/api/v1/orders/${o1.id}`, { token })).body.data.status === 'PENDING');
  check('admin cannot confirm an unpaid online order', (await setStatus(o1.id, 'CONFIRMED')).status === 409);
  const declined = await api('POST', '/api/v1/mock-gateway/pay', { token, body: { gatewayOrderId: o1.pay.gatewayOrderId, outcome: 'failure' } });
  check('declined payment → 402', declined.status === 402);
  check('failed payment recorded', (await api('GET', `/api/v1/orders/${o1.id}`, { token })).body.data.paymentStatus === 'FAILED');
  const retry = await api('POST', '/api/v1/payments/create', { token, body: { orderId: o1.id } });
  check('retry reuses the same gateway order', retry.body.data.gatewayOrderId === o1.pay.gatewayOrderId);
  const paid = await api('POST', '/api/v1/mock-gateway/pay', { token, body: { gatewayOrderId: o1.pay.gatewayOrderId, outcome: 'success', skipWebhook: true } });
  const verified = await api('POST', '/api/v1/payments/verify', { token, body: paid.body.data });
  check('payment verified server-side', verified.status === 200 && verified.body.data.verified, verified.body);
  const o1d = (await api('GET', `/api/v1/orders/${o1.id}`, { token })).body.data;
  check('order confirmed and paid', o1d.status === 'CONFIRMED' && o1d.paymentStatus === 'PAID' && o1d.invoiceAvailable);
  let sInv = await prisma.inventory.findUniqueOrThrow({ where: { id: serumInv.id } });
  check('stock deducted once', sInv.stock === serumInv.stock - 1 && sInv.reserved === serumInv.reserved, sInv);
  check('duplicate verify request is harmless', (await api('POST', '/api/v1/payments/verify', { token, body: paid.body.data })).status === 200);
  const entity = { id: paid.body.data.razorpay_payment_id, order_id: o1.pay.gatewayOrderId, amount: o1.total, status: 'captured', method: 'upi' };
  const wh1 = await webhook('payment.captured', { payment: { entity } }, `evt-${stamp}-1`);
  const wh2 = await webhook('payment.captured', { payment: { entity } }, `evt-${stamp}-1`);
  const wh3 = await webhook('payment.captured', { payment: { entity } }, `evt-${stamp}-2`);
  check('webhook accepted', wh1.status === 200);
  check('duplicate webhook (same event id) is ignored', wh2.body.data?.status === 'duplicate', wh2.body);
  check('repeated webhook (new event id) is idempotent', wh3.status === 200);
  sInv = await prisma.inventory.findUniqueOrThrow({ where: { id: serumInv.id } });
  check('no double stock deduction or duplicate payment', sInv.stock === serumInv.stock - 1 && (await prisma.payment.count({ where: { orderId: o1.id } })) === 1);
  check('webhook with a bad signature → 400', (await webhook('payment.captured', { payment: { entity } }, `evt-${stamp}-3`, 'wrong-secret')).status === 400);

  const o2 = await newOnlineOrder(serum.id);
  const tampered = await webhook('payment.captured', { payment: { entity: { id: `pay_t_${stamp}`, order_id: o2.pay.gatewayOrderId, amount: 100, status: 'captured' } } }, `evt-${stamp}-4`);
  check('webhook with a tampered amount is ignored', tampered.status === 200 && tampered.body.data?.status === 'ignored', tampered.body);
  check('order stays unpaid after amount mismatch', (await api('GET', `/api/v1/orders/${o2.id}`, { token })).body.data.status === 'PENDING');
  await api('POST', '/api/v1/mock-gateway/pay', { token, body: { gatewayOrderId: o2.pay.gatewayOrderId, outcome: 'success' } }); // browser "disconnects": no verify call
  await sleep(1500);
  const o2d = (await api('GET', `/api/v1/orders/${o2.id}`, { token })).body.data;
  check('paid but browser disconnected → webhook confirms the order', o2d.status === 'CONFIRMED' && o2d.paymentStatus === 'PAID', { s: o2d.status, p: o2d.paymentStatus });

  section('Cancellation → gateway refund');
  const beforeCancel = (await prisma.inventory.findUniqueOrThrow({ where: { id: serumInv.id } })).stock;
  check('customer cancels a paid order', (await api('POST', `/api/v1/orders/${o2.id}/cancel`, { token, body: { reason: 'Ordered twice by mistake' } })).status === 200);
  check('cancelling again → 409', (await api('POST', `/api/v1/orders/${o2.id}/cancel`, { token, body: { reason: 'Ordered twice by mistake' } })).status === 409);
  check('stock restored on cancellation', (await prisma.inventory.findUniqueOrThrow({ where: { id: serumInv.id } })).stock === beforeCancel + 1);
  let o2r = (await api('GET', `/api/v1/orders/${o2.id}`, { token })).body.data;
  check('refund pending, not yet completed', o2r.status === 'REFUND_PENDING' && o2r.refunds[0].status === 'APPROVED');
  const proc = await api('POST', `/api/v1/admin/refunds/${o2r.refunds[0].id}/process`, { token: admin, body: {} });
  check('refund sent to gateway — still PROCESSING until the gateway confirms', proc.body.data?.status === 'PROCESSING', proc.body);
  check('double-processing is blocked', (await api('POST', `/api/v1/admin/refunds/${o2r.refunds[0].id}/process`, { token: admin, body: {} })).status === 409);
  await sleep(3500);
  o2r = (await api('GET', `/api/v1/orders/${o2.id}`, { token })).body.data;
  check('gateway webhook completes the refund', o2r.status === 'REFUNDED' && o2r.paymentStatus === 'REFUNDED' && o2r.refunds[0].status === 'COMPLETED', { s: o2r.status, r: o2r.refunds[0]?.status });

  section('Unpaid order expiry');
  const o3 = await newOnlineOrder(serum.id, 2);
  const reservedNow = (await prisma.inventory.findUniqueOrThrow({ where: { id: serumInv.id } })).reserved;
  await prisma.order.update({ where: { id: o3.id }, data: { createdAt: new Date(Date.now() - 3 * 3600_000) } });
  await expireStalePendingOrders();
  const o3d = (await api('GET', `/api/v1/orders/${o3.id}`, { token })).body.data;
  check('stale unpaid order is cancelled', o3d.status === 'CANCELLED' && o3d.paymentStatus === 'FAILED', { s: o3d.status, p: o3d.paymentStatus });
  check('its reserved stock is released', (await prisma.inventory.findUniqueOrThrow({ where: { id: serumInv.id } })).reserved === reservedNow - 2);
  check('payment for a cancelled order cannot be created', (await api('POST', '/api/v1/payments/create', { token, body: { orderId: o3.id } })).status === 409);

  // ───────────────────────── Admin catalogue + cart edge cases ─────────────────────────
  section('Admin: products, inventory, price change & deletion while in cart');
  const cats = (await api('GET', '/api/v1/admin/categories', { token: admin })).body.data;
  const created = await api('POST', '/api/v1/admin/products', {
    token: admin,
    body: { name: `E2E Test Mug ${stamp}`, sku: `E2E-${stamp}`, categoryId: cats[0].id, description: 'Temporary product created by the e2e test.', price: 50000, discountPrice: 40000, stock: 5, tags: ['e2e'], images: [] },
  });
  check('admin creates a product', created.status === 201, created.body);
  const mugSlug: string = created.body.data.slug;
  const mugId: string = created.body.data.id;
  const mug = await bySlug(mugSlug);
  check('new product is live on the storefront', mug?.sellingPrice === 40000 && mug.available === 5 && mug.discountPercent === 20, mug);
  check('bad product payload → 400', (await api('POST', '/api/v1/admin/products', { token: admin, body: { name: 'x', price: -5 } })).status === 400);
  const invRows = (await api('GET', `/api/v1/admin/inventory?q=E2E-${stamp}`, { token: admin })).body.data;
  const adj = await api('POST', `/api/v1/admin/inventory/${invRows[0].id}/adjust`, { token: admin, body: { mode: 'increase', quantity: 7, note: 'e2e restock' } });
  check('admin restocks inventory', adj.body.data?.stock === 12, adj.body);
  check('stock history recorded', (await api('GET', `/api/v1/admin/inventory/${invRows[0].id}/history`, { token: admin })).body.data.length >= 2);
  await api('DELETE', '/api/v1/cart', { token });
  await api('POST', '/api/v1/cart/items', { token, body: { productId: mugId, quantity: 2 } });
  const full = (await api('GET', `/api/v1/admin/products/${mugId}`, { token: admin })).body.data;
  const upd = await api('PUT', `/api/v1/admin/products/${mugId}`, {
    token: admin,
    body: { ...full, price: 50000, discountPrice: 45000, stock: full.baseStock, images: [], variants: [] },
  });
  check('admin updates the price', upd.status === 200, upd.body);
  cart = await api('GET', '/api/v1/cart', { token });
  check('cart reflects the new price', cart.body.data.items[0].unitPrice === 45000 && cart.body.data.summary.subtotal === 90000, cart.body.data.items[0]);
  check('admin deletes the product', (await api('DELETE', `/api/v1/admin/products/${mugId}`, { token: admin })).status === 200);
  check('deleted product disappears from the storefront', (await api('GET', `/api/v1/products/${mugSlug}`)).status === 404);
  check('deleted product is removed from carts', (await api('GET', '/api/v1/cart', { token })).body.data.items.length === 0);
  check('checkout with an empty cart → 400', (await api('POST', '/api/v1/orders', { token, body: { addressId, paymentMethod: 'COD' } })).status === 400);

  section('Admin: coupons, content, settings, uploads, customers');
  const cpn = await api('POST', '/api/v1/admin/coupons', { token: admin, body: { code: `E2E${stamp}`.toUpperCase(), discountType: 'FIXED', value: 5000, usageLimit: 1 } });
  check('admin creates a coupon', cpn.status === 201, cpn.body);
  await api('POST', '/api/v1/cart/items', { token, body: { productId: serum.id, quantity: 1 } });
  await api('POST', '/api/v1/cart/coupon', { token, body: { code: cpn.body.data.code } });
  const usedOrder = await api('POST', '/api/v1/orders', { token, body: { addressId, paymentMethod: 'COD' } });
  check('order with single-use coupon', usedOrder.status === 201);
  await api('POST', '/api/v1/cart/items', { token, body: { productId: serum.id, quantity: 1 } });
  const exhausted = await api('POST', '/api/v1/cart/coupon', { token, body: { code: cpn.body.data.code } });
  check('coupon usage limit reached', exhausted.status === 400 && /usage limit/i.test(exhausted.body.message), exhausted.body);
  await api('POST', `/api/v1/orders/${usedOrder.body.data.id}/cancel`, { token, body: { reason: 'e2e cleanup' } });
  check('cancelling the order frees the coupon again', (await api('POST', '/api/v1/cart/coupon', { token, body: { code: cpn.body.data.code } })).status === 200);
  await api('DELETE', '/api/v1/cart', { token });
  await api('PATCH', `/api/v1/admin/coupons/${cpn.body.data.id}`, { token: admin, body: { isActive: false } });

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const form = new FormData();
  form.append('files', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'pixel.png');
  const up = await fetch(`${BASE}/api/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: form });
  const upBody: Json = await up.json();
  check('image upload', up.status === 201 && upBody.data.urls.length === 1, upBody);
  check('uploaded file is served', (await fetch(`${BASE}${upBody.data.urls[0]}`)).status === 200);
  const evil = new FormData();
  evil.append('files', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'evil.png');
  check('non-image upload rejected (content sniffing)', (await fetch(`${BASE}/api/v1/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${admin}` }, body: evil })).status === 400);
  check('upload requires login', (await fetch(`${BASE}/api/v1/uploads`, { method: 'POST', body: form })).status === 401);

  const current = (await api('GET', '/api/v1/admin/settings', { token: admin })).body.data.settings;
  const saved = await api('PUT', '/api/v1/admin/settings/store', { token: admin, body: { ...current.store, tagline: `Tagline ${stamp}` } });
  check('admin updates store settings', saved.status === 200, saved.body);
  check('public settings reflect the change', (await api('GET', '/api/v1/settings/public')).body.data.store.tagline === `Tagline ${stamp}`);
  await api('PUT', '/api/v1/admin/settings/store', { token: admin, body: current.store });
  check('settings never expose secrets', !JSON.stringify((await api('GET', '/api/v1/admin/settings', { token: admin })).body).includes(SECRET));
  check('analytics', (await api('GET', '/api/v1/admin/analytics?range=7d', { token: admin })).body.data.series.length === 7);
  check('payments list', (await api('GET', '/api/v1/admin/payments', { token: admin })).body.data.length > 0);
  check('audit log records admin actions', (await api('GET', '/api/v1/admin/settings/audit-logs', { token: admin })).body.data.some((l: Json) => l.action === 'order.status'));

  section('Announcements');
  const notice = { title: `Flash sale ${stamp}`, message: 'Extra 10% off everything this weekend.', link: '/offers' };
  check('customer cannot send announcements', (await api('POST', '/api/v1/admin/notifications/broadcast', { token, body: notice })).status === 403);
  const offSite = await api('POST', '/api/v1/admin/notifications/broadcast', { token: admin, body: { ...notice, link: 'https://evil.example' } });
  check('announcement links must stay on the site', offSite.status === 400 && !!offSite.body.error?.fields?.link, offSite.body);
  const sent = await api('POST', '/api/v1/admin/notifications/broadcast', { token: admin, body: notice });
  check('admin sends an announcement to customers', sent.status === 201 && sent.body.data.recipients > 0, sent.body);
  const inbox = (await api('GET', '/api/v1/notifications?limit=5', { token })).body.data;
  check('customer receives the announcement', inbox.some((n: Json) => n.title === notice.title && n.type === 'OFFER' && n.link === '/offers'));

  section('Support');
  const ticket = await api('POST', '/api/v1/support/tickets', { token, body: { name: 'E2E Tester', email, subject: 'Where is my order?', message: 'Please share an update on my latest order.' } });
  check('contact form creates a ticket', ticket.status === 201, ticket.body);
  check('admin replies', (await api('POST', `/api/v1/admin/support/${ticket.body.data.id}/messages`, { token: admin, body: { message: 'It is on the way!' } })).status === 201);
  const thread = (await api('GET', `/api/v1/support/tickets/${ticket.body.data.id}`, { token })).body.data;
  check('customer sees the reply; ticket in progress', thread.messages.length === 2 && thread.status === 'IN_PROGRESS');

  section('Account disable');
  const me = (await api('GET', '/api/v1/auth/me', { token })).body.data;
  check('admin disables the customer', (await api('PATCH', `/api/v1/admin/customers/${me.id}`, { token: admin, body: { isActive: false } })).status === 200);
  check('disabled customer token stops working', (await api('GET', '/api/v1/auth/me', { token })).status === 401);
  check('disabled customer cannot log in', (await api('POST', '/api/v1/auth/login', { body: { email, password } })).status === 403);
  await api('PATCH', `/api/v1/admin/customers/${me.id}`, { token: admin, body: { isActive: true } });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) console.log('Failed:\n' + failures.map((f) => `  - ${f}`).join('\n'));
  return failures.length;
}
