// Responsive check: loads every page as a guest, a customer and the admin at each viewport width and
// reports horizontal overflow, console errors, page errors, failed requests and unexpected redirects.
// Usage: node responsive.mjs [width …]      (default: the widths below)
//        E2E_ROLES=guest,customer,admin     limits the roles checked
//        E2E_SCREENSHOTS=1                  saves a full-page screenshot of every page at 360px and 768px
import { ADMIN, API, BASE, CUSTOMER, OUT, launchBrowser } from './browser.mjs';

const DEFAULT_WIDTHS = [360, 375, 390, 412, 768, 1024, 1280, 1440, 1920];
const widths = process.argv.slice(2).map(Number).filter(Boolean);
const roles = (process.env.E2E_ROLES ?? 'guest,customer,admin').split(',');
const PARALLEL = 3;

async function apiSession({ email, password }) {
  const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Could not sign in as ${email}: ${body.message}`);
  const headers = { Authorization: `Bearer ${body.data.accessToken}`, 'Content-Type': 'application/json' };
  return { headers, get: (path) => fetch(`${API}${path}`, { headers }).then((r) => r.json()) };
}

// Detail pages need real ids, resolved through the API.
async function pagesFor(role) {
  if (role === 'guest') {
    return ['/', '/about', '/products', '/category/beauty', '/search?q=serum', '/product/vitamin-c-serum', '/product/casual-cotton-t-shirt', '/cart', '/offers', '/contact',
      '/return-policy', '/shipping-policy', '/privacy', '/terms', '/login', '/register', '/forgot-password', '/reset-password?token=invalid', '/admin/login', '/no-such-page'];
  }
  if (role === 'admin') {
    const api = await apiSession(ADMIN);
    const order = (await api.get('/admin/orders?limit=1')).data[0];
    const product = (await api.get('/admin/products?limit=1&sort=sales')).data[0];
    return ['/admin', '/admin/analytics', '/admin/products', '/admin/products/new', `/admin/products/${product.id}/edit`, '/admin/categories', '/admin/inventory', '/admin/orders', `/admin/orders/${order.id}`,
      '/admin/customers', '/admin/payments', '/admin/refunds', '/admin/coupons', '/admin/content', '/admin/reviews', '/admin/support', '/admin/settings'];
  }
  const api = await apiSession(CUSTOMER);
  const order = (await api.get('/orders?limit=1')).data[0];
  // The checkout steps only render with something in the cart.
  const product = (await fetch(`${API}/products/vitamin-c-serum`).then((r) => r.json())).data;
  await fetch(`${API}/cart/items`, { method: 'POST', headers: api.headers, body: JSON.stringify({ productId: product.id, quantity: 1 }) });
  return ['/cart', '/checkout/address', '/checkout', '/checkout/payment', `/order/success/${order.id}`, '/account/orders', `/account/orders/${order.id}`, `/account/orders/${order.id}/tracking`,
    '/account/profile', '/account/addresses', '/account/notifications', '/account/reviews', '/wishlist', '/contact'];
}

// Elements sticking out of the viewport that are not inside a horizontally scrollable container.
const measure = () => {
  const vw = window.innerWidth;
  const overflow = document.documentElement.scrollWidth - vw;
  const offenders = [];
  if (overflow > 1) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1 || r.width === 0) continue;
      let p = el.parentElement;
      let contained = false;
      while (p && !contained) {
        contained = ['auto', 'scroll', 'hidden'].includes(getComputedStyle(p).overflowX);
        p = p.parentElement;
      }
      if (!contained) offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')}`);
    }
  }
  return { overflow, offenders: offenders.slice(0, 4), path: location.pathname };
};

const browser = await launchBrowser();
const problems = [];
let checked = 0;

async function checkWidth(role, pages, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 850 } });
  const page = await ctx.newPage();
  let current = 'sign-in';
  const report = (text) => problems.push(`${role} @ ${width}px ${current}: ${text}`);
  page.on('console', (m) => m.type() === 'error' && report(`console: ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => report(`page error: ${e.message.slice(0, 200)}`));
  page.on('response', (r) => r.status() >= 400 && report(`http ${r.status()} ${r.url()}`));

  if (role !== 'guest') {
    const creds = role === 'admin' ? ADMIN : CUSTOMER;
    await page.goto(`${BASE}${role === 'admin' ? '/admin/login' : '/login'}`);
    await page.locator('input[type=email]').fill(creds.email);
    await page.locator('input[type=password]').fill(creds.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 });
    // Checkout steps 2 and 3 need a selected address; step 1 selects the default one.
    if (role === 'customer') await page.goto(`${BASE}/checkout/address`, { waitUntil: 'networkidle' });
  }

  for (const path of pages) {
    current = path;
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    const m = await page.evaluate(measure);
    if (m.overflow > 1) report(`overflows horizontally by ${m.overflow}px → ${m.offenders.join(' | ')}`);
    if (m.path !== path.split('?')[0]) report(`redirected to ${m.path}`);
    if (process.env.E2E_SCREENSHOTS && [360, 768].includes(width)) {
      await page.screenshot({ path: `${OUT}r-${role}${path.replace(/[^a-z]+/gi, '_').replace(/_[a-z0-9]{20,}/gi, '_id')}-${width}.png`, fullPage: true });
    }
    checked++;
  }
  await ctx.close();
}

try {
  for (const role of roles) {
    const pages = await pagesFor(role);
    const queue = [...(widths.length ? widths : DEFAULT_WIDTHS)];
    await Promise.all(
      Array.from({ length: PARALLEL }, async () => {
        for (let width = queue.shift(); width; width = queue.shift()) {
          await checkWidth(role, pages, width).catch((err) => problems.push(`${role} @ ${width}px: ${String(err.message ?? err).split('\n')[0]}`));
        }
      }),
    );
    console.log(`  ${role}: ${pages.length} pages × ${(widths.length ? widths : DEFAULT_WIDTHS).join(', ')}px`);
  }
} finally {
  await browser.close();
}

const unique = [...new Set(problems)];
console.log(`\n${checked} page loads checked`);
console.log(unique.length ? `${unique.length} problems:\n${unique.map((p) => `  - ${p}`).join('\n')}` : 'No overflow, console errors, page errors, failed requests or unexpected redirects.');
process.exit(unique.length ? 1 : 0);
