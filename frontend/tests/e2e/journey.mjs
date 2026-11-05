// Click-through UI test of the customer journey and the admin order flow in a real browser.
import { ADMIN, BASE, OUT, launchBrowser } from './browser.mjs';

const stamp = Date.now().toString(36);
const email = `ui.${stamp}@example.com`;
const password = 'Test@12345';
const sku = `UI-${stamp}`.toUpperCase();

const browser = await launchBrowser();
const problems = [];
let passed = 0;
const failed = [];

function watch(page, who) {
  // "Failed to load resource" is the browser echoing an HTTP error; expected 4xx (e.g. a declined
  // payment) are part of the journey and 5xx are caught by the response check below.
  page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && problems.push(`[${who}] console: ${m.text().slice(0, 400)}`));
  page.on('pageerror', (e) => problems.push(`[${who}] pageerror: ${e.message.slice(0, 400)}`));
  page.on('response', (r) => r.status() >= 500 && problems.push(`[${who}] http ${r.status()}: ${r.url()}`));
}
async function step(name, fn, page) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed.push(name);
    console.log(`  ✗ ${name}\n      ${String(err.message ?? err).split('\n').slice(0, 4).join('\n      ')}`);
    if (page) await page.screenshot({ path: `${OUT}FAIL-${failed.length}.png` }).catch(() => {});
  }
}
const shot = (page, name) => page.screenshot({ path: `${OUT}j-${name}.png`, fullPage: true });

// ───────────── Customer ─────────────
const cctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const c = await cctx.newPage();
watch(c, 'customer');
c.setDefaultTimeout(15000);
let codOrderNumber = '';
let codOrderUrl = '';

console.log('\nCustomer journey');
await step('register', async () => {
  await c.goto(`${BASE}/register`);
  await c.getByLabel('Full name').fill('UI Tester');
  await c.getByLabel('Email').fill(email);
  await c.locator('input[autocomplete="new-password"]').nth(0).fill(password);
  await c.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await c.getByRole('button', { name: 'Create account' }).click();
  await c.waitForURL(`${BASE}/`);
  await c.getByText('Your account is ready').waitFor();
}, c);

await step('session survives a page reload', async () => {
  await c.reload();
  await c.getByRole('button', { name: /UI/ }).waitFor(); // account menu shows the first name
}, c);

await step('search → results → product page', async () => {
  const box = c.getByRole('searchbox', { name: 'Search products' }).first();
  await box.fill('serum');
  await box.press('Enter');
  await c.waitForURL(/\/search\?q=serum/);
  await c.getByRole('heading', { name: /Search results for/ }).waitFor();
  await c.getByRole('link', { name: 'Vitamin C Serum' }).first().click();
  await c.waitForURL(/\/product\/vitamin-c-serum/);
  await c.getByRole('heading', { name: 'Vitamin C Serum', level: 1 }).waitFor();
}, c);

await step('wishlist: add from product page, see it on /wishlist', async () => {
  await c.getByRole('button', { name: 'Add to wishlist' }).first().click();
  await c.getByRole('status').getByText('Saved to wishlist').waitFor();
  await c.goto(`${BASE}/wishlist`);
  await c.getByRole('link', { name: 'Vitamin C Serum' }).first().waitFor();
  await shot(c, 'wishlist');
}, c);

await step('wishlist → move to cart', async () => {
  await c.getByRole('button', { name: 'Move to cart' }).click();
  await c.getByText('Moved to cart').waitFor();
  await c.getByText('Your wishlist is empty').waitFor();
}, c);

await step('product with variants: choose color + size, quantity 2, add to cart', async () => {
  await c.goto(`${BASE}/product/casual-cotton-t-shirt`);
  await c.getByRole('radio', { name: 'Red' }).click();
  await c.getByRole('radio', { name: 'L', exact: true }).click();
  await c.getByRole('button', { name: 'Increase quantity' }).first().click();
  await c.getByRole('button', { name: 'Add to Cart', exact: true }).click();
  await c.getByText('Added to cart').waitFor();
}, c);

await step('filters on the products page (category + sort) update the grid and URL', async () => {
  await c.goto(`${BASE}/products`);
  await c.getByRole('button', { name: /^Beauty/ }).click();
  await c.waitForURL(/category=beauty/);
  await c.locator('#sort').selectOption('price_asc');
  await c.waitForURL(/sort=price_asc/);
  await c.getByText('4 products').waitFor();
}, c);

await step('cart shows both lines; coupon WELCOME10 applies', async () => {
  await c.goto(`${BASE}/cart`);
  await c.getByText('Casual Cotton T-Shirt').first().waitFor();
  await c.getByText('Size: L · Color: Red').waitFor();
  await c.locator('#coupon').fill('WELCOME10');
  await c.getByRole('button', { name: 'Apply' }).click();
  await c.getByText('WELCOME10 applied').waitFor();
  await shot(c, 'cart');
}, c);

await step('cart quantity change recalculates', async () => {
  const before = await c.getByText(/Shopping cart/).textContent();
  await c.getByRole('button', { name: 'Increase quantity' }).first().click();
  await c.waitForFunction((b) => document.querySelector('h1')?.textContent !== b, before);
}, c);

await step('checkout step 1: add an address (validation, then save)', async () => {
  await c.getByRole('button', { name: 'Proceed to Checkout' }).click();
  await c.waitForURL(/\/checkout\/address/);
  await c.getByRole('button', { name: 'Add a new address' }).click();
  const dlg = c.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Save address' }).click();
  await dlg.getByText('Enter a valid 6-digit PIN code').waitFor(); // client-side validation
  await dlg.getByLabel('Full name').fill('UI Tester');
  await dlg.getByLabel('Phone').fill('9820098200');
  await dlg.getByPlaceholder('House no., building, area').fill('42 Linking Road');
  await dlg.getByLabel('City').fill('Mumbai');
  await dlg.getByLabel('State').selectOption('Maharashtra');
  await dlg.getByLabel('PIN code').fill('400050');
  await dlg.getByRole('button', { name: 'Save address' }).click();
  await c.getByText('Address added').waitFor();
  await shot(c, 'checkout-address');
  await c.getByRole('button', { name: 'Deliver to this address' }).click();
  await c.waitForURL(`${BASE}/checkout`);
}, c);

await step('checkout step 2: order summary shows address, items, totals', async () => {
  await c.getByRole('heading', { name: 'Review your order' }).waitFor();
  await c.getByText('Estimated delivery by').waitFor();
  await c.getByText('Grand total').waitFor();
  await shot(c, 'checkout-summary');
  await c.getByRole('button', { name: 'Continue to payment' }).click();
  await c.waitForURL(/\/checkout\/payment/);
}, c);

await step('checkout step 3: pay online (UPI) → verified → step 4 confirmation', async () => {
  await shot(c, 'checkout-payment');
  await c.getByRole('button', { name: /^Pay ₹/ }).click();
  const dlg = c.getByRole('dialog', { name: 'Test payment gateway' });
  await dlg.waitFor();
  await c.screenshot({ path: `${OUT}j-gateway.png` });
  await dlg.getByRole('button', { name: 'Simulate successful payment' }).click();
  await c.waitForURL(/\/order\/success\//);
  await c.getByRole('heading', { name: 'Order Placed Successfully' }).waitFor();
  await c.getByText('Paid').first().waitFor();
  await shot(c, 'order-success');
}, c);

await step('order details: confirmed + paid, invoice downloads as PDF', async () => {
  await c.getByRole('link', { name: 'View Order' }).click();
  await c.waitForURL(/\/account\/orders\/[a-z0-9]+$/);
  await c.getByText('Confirmed').first().waitFor();
  const [download] = await Promise.all([c.waitForEvent('download'), c.getByRole('button', { name: 'Download Invoice' }).click()]);
  if (!download.suggestedFilename().endsWith('.pdf')) throw new Error(`unexpected file ${download.suggestedFilename()}`);
  await shot(c, 'order-detail');
}, c);

await step('order tracking timeline', async () => {
  await c.getByRole('link', { name: 'Track order' }).click();
  await c.waitForURL(/\/tracking$/);
  await c.getByText('Order Placed').first().waitFor();
  await c.getByText('Out for Delivery').waitFor();
  await shot(c, 'tracking');
}, c);

await step('cart is empty after ordering', async () => {
  await c.goto(`${BASE}/cart`);
  await c.getByText('Your cart is empty').waitFor();
}, c);

await step('second order: Buy Now → Cash on Delivery', async () => {
  await c.goto(`${BASE}/product/luxury-face-cream`);
  await c.getByRole('button', { name: 'Buy Now' }).click();
  await c.waitForURL(/\/checkout\/address/);
  await c.getByRole('button', { name: 'Deliver to this address' }).click();
  await c.getByRole('button', { name: 'Continue to payment' }).click();
  await c.getByText('Cash on Delivery', { exact: true }).click();
  await c.getByRole('button', { name: 'Place Order' }).click();
  await c.waitForURL(/\/order\/success\//);
  await c.getByRole('heading', { name: 'Order Placed Successfully' }).waitFor();
  codOrderNumber = (await c.locator('dd').filter({ hasText: /^SH\d+$/ }).first().textContent()).trim();
  codOrderUrl = c.url().replace('/order/success/', '/account/orders/');
}, c);

await step('third order: payment fails → retry → succeeds', async () => {
  await c.goto(`${BASE}/product/wireless-earbuds-pro`);
  await c.getByRole('button', { name: 'Buy Now' }).click();
  await c.getByRole('button', { name: 'Deliver to this address' }).click();
  await c.getByRole('button', { name: 'Continue to payment' }).click();
  await c.getByText('Net Banking', { exact: true }).click();
  await c.getByRole('button', { name: /^Pay ₹/ }).click();
  await c.getByRole('button', { name: 'Simulate failed payment' }).click();
  await c.getByRole('heading', { name: 'Payment not completed' }).waitFor();
  await c.getByText('Payment declined by the test gateway').waitFor();
  await shot(c, 'payment-failed');
  await c.getByRole('button', { name: 'Retry payment' }).click();
  await c.getByRole('button', { name: 'Simulate successful payment' }).click();
  await c.waitForURL(/\/order\/success\//);
  await c.getByRole('heading', { name: 'Order Placed Successfully' }).waitFor();
}, c);

await step('my orders list + status filter', async () => {
  await c.goto(`${BASE}/account/orders`);
  await c.getByText(codOrderNumber).waitFor();
  await shot(c, 'orders');
  await c.getByRole('tab', { name: 'Delivered' }).click();
  await c.getByText('No orders in this category').waitFor();
}, c);

await step('customer is blocked from /admin', async () => {
  await c.goto(`${BASE}/admin`);
  await c.getByRole('heading', { name: 'Access denied' }).waitFor();
}, c);

// ───────────── Admin ─────────────
const actx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const a = await actx.newPage();
watch(a, 'admin');
a.setDefaultTimeout(15000);

console.log('\nAdmin journey');
await step('visiting /admin signed out redirects to the admin login', async () => {
  await a.goto(`${BASE}/admin/orders`);
  await a.waitForURL(/\/admin\/login/);
}, a);

await step('admin login → dashboard', async () => {
  await a.locator('input[type=email]').fill(ADMIN.email);
  await a.locator('input[type=password]').fill(ADMIN.password);
  await a.getByRole('button', { name: 'Sign in' }).click();
  await a.waitForURL(/\/admin\/orders/); // returns to the page originally requested
  await a.getByRole('link', { name: 'Dashboard' }).click();
  await a.getByText('Total Revenue').waitFor();
}, a);

await step('add product', async () => {
  await a.goto(`${BASE}/admin/products`);
  await a.getByRole('link', { name: 'Add product' }).click();
  await a.getByRole('button', { name: 'Create product' }).first().click();
  await a.getByText('Product name is required').waitFor(); // validation
  await a.getByLabel('Product Name').fill(`UI Test Bottle ${stamp}`);
  await a.getByLabel('SKU').fill(sku);
  await a.getByLabel('Description').fill('Insulated steel bottle created by the UI test.');
  await a.locator('select').filter({ hasText: 'Select category' }).selectOption({ label: 'Home & Living' });
  await a.getByLabel('Price (MRP)').fill('899');
  await a.getByLabel('Discount Price').fill('699');
  await a.getByLabel('Stock', { exact: true }).fill('10');
  await shot(a, 'admin-product-form');
  await a.getByRole('button', { name: 'Create product' }).first().click();
  await a.waitForURL(/\/admin\/products$/);
  await a.getByText('Product created').waitFor();
  await a.getByRole('link', { name: `UI Test Bottle ${stamp}` }).waitFor();
}, a);

await step('new product is visible on the storefront with the right price', async () => {
  const p = await actx.newPage();
  await p.goto(`${BASE}/search?q=${encodeURIComponent('UI Test Bottle ' + stamp)}`);
  await p.getByRole('link', { name: `UI Test Bottle ${stamp}` }).first().click();
  await p.getByText('₹699').first().waitFor();
  await p.getByText('In stock').waitFor();
  await p.close();
}, a);

await step('update stock in inventory (+5) and see history', async () => {
  await a.goto(`${BASE}/admin/inventory?q=${sku}`);
  await a.getByRole('button', { name: 'Adjust' }).click();
  const dlg = a.getByRole('dialog');
  await dlg.getByLabel('Quantity').fill('5');
  await dlg.getByLabel('Reason / note').fill('UI test restock');
  await dlg.getByRole('button', { name: 'Update stock' }).click();
  await a.getByText('Stock updated').waitFor();
  await a.getByRole('row', { name: new RegExp(sku) }).getByText('15').first().waitFor();
  await a.getByRole('button', { name: 'Stock history' }).click();
  await a.getByRole('dialog').getByText('UI test restock').waitFor();
  await a.keyboard.press('Escape');
}, a);

await step('receive the customer order', async () => {
  await a.goto(`${BASE}/admin/orders?q=${codOrderNumber}`);
  await a.getByRole('link', { name: 'View', exact: true }).click();
  await a.getByRole('heading', { name: `Order ${codOrderNumber}` }).waitFor();
  await a.getByText('UI Tester').first().waitFor();
  await shot(a, 'admin-order');
}, a);

const advance = async (button, confirm = button, fill) => {
  await a.getByRole('button', { name: button, exact: true }).click();
  const dlg = a.getByRole('dialog');
  if (fill) await fill(dlg);
  await dlg.getByRole('button', { name: confirm, exact: true }).click();
  await dlg.waitFor({ state: 'detached' });
};
await step('process order: confirm → pack', async () => {
  await advance('Confirm');
  await a.getByText('Confirmed').first().waitFor();
  await advance('Pack');
  await a.getByText('Packed').first().waitFor();
}, a);
await step('ship with courier + tracking number', async () => {
  await advance('Ship', 'Ship', async (dlg) => {
    await dlg.getByLabel('Courier').fill('Delhivery');
    await dlg.getByLabel('Tracking number').fill('DL99887766');
  });
  await a.getByText('DL99887766').waitFor();
}, a);
await step('out for delivery → delivered (COD marked paid)', async () => {
  await advance('Mark Out for Delivery');
  await advance('Mark Delivered');
  await a.getByText('Delivered').first().waitFor();
  await a.getByText('Successful').first().waitFor();
}, a);

await step('dashboard revenue + charts render', async () => {
  await a.goto(`${BASE}/admin`);
  await a.getByText('Total Revenue').waitFor();
  await a.locator('.recharts-surface').first().waitFor();
  await a.getByText(codOrderNumber).waitFor(); // in recent orders
  await a.getByRole('button', { name: '7 Days' }).click();
  await a.waitForTimeout(800);
  await a.getByRole('button', { name: 'Table' }).first().click(); // table twin of the chart
  await a.getByRole('columnheader', { name: 'Revenue' }).waitFor();
}, a);

await step('send an announcement to customers', async () => {
  await a.goto(`${BASE}/admin/content`);
  const card = a.locator('section').filter({ has: a.getByRole('heading', { name: 'Send announcement' }) });
  await card.getByLabel('Title').fill(`Weekend sale ${stamp}`);
  await card.getByLabel('Message').fill('Extra savings across the store this weekend.');
  await card.getByLabel('Link (optional)').fill('/offers');
  await card.getByRole('button', { name: 'Send to customers' }).click();
  await a.getByRole('dialog').getByRole('button', { name: 'Send', exact: true }).click();
  await a.getByText(/Announcement sent to \d+ customer/).waitFor();
}, a);

// ───────────── Customer, after delivery ─────────────
console.log('\nCustomer, after delivery');
await step('order shows delivered with tracking details', async () => {
  await c.goto(codOrderUrl);
  await c.getByText('Delivered').first().waitFor();
  await c.getByText('DL99887766').first().waitFor();
}, c);

await step('notifications received; mark all as read', async () => {
  await c.goto(`${BASE}/account/notifications`);
  await c.getByText('Order delivered').first().waitFor();
  await c.getByText('Order shipped').first().waitFor();
  await c.getByText(`Weekend sale ${stamp}`).waitFor();
  await shot(c, 'notifications');
  await c.getByRole('button', { name: 'Mark all as read' }).click();
  await c.getByText('All notifications marked as read').waitFor();
}, c);

await step('write a review for the delivered product', async () => {
  await c.goto(`${BASE}/account/reviews`);
  await c.getByRole('button', { name: 'Write a review' }).first().click();
  const dlg = c.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Submit review' }).click();
  await dlg.getByText('Select a star rating').waitFor();
  await dlg.getByRole('radio', { name: '5 stars' }).click();
  await dlg.getByLabel('Title').fill('Lovely cream');
  await dlg.getByLabel('Comment').fill('Light texture and it absorbs quickly. Will buy again.');
  await dlg.getByRole('button', { name: 'Submit review' }).click();
  await c.getByText('Thanks for your review!').waitFor();
  await c.getByText('Lovely cream').waitFor();
}, c);

await step('the review appears on the product page', async () => {
  await c.goto(`${BASE}/product/luxury-face-cream`);
  await c.getByText('Lovely cream').first().waitFor();
  await c.getByText('UI Tester').first().waitFor();
}, c);

await step('request a return', async () => {
  await c.goto(codOrderUrl);
  await c.getByRole('button', { name: 'Return Product' }).click();
  await c.getByRole('dialog').getByRole('button', { name: 'Request return' }).click();
  await c.getByText('Return request submitted').waitFor();
  await c.getByText('Return requested').first().waitFor();
}, c);

await step('admin sees the return request on the refunds page and approves it', async () => {
  await a.goto(`${BASE}/admin/refunds?status=REQUESTED`);
  await a.getByRole('link', { name: codOrderNumber }).waitFor();
  await shot(a, 'admin-refunds');
  await a.locator('li').filter({ hasText: codOrderNumber }).getByRole('button', { name: 'Approve Return' }).click();
  await a.getByText('Return approved').first().waitFor();
}, a);

await step('contact form creates a support ticket; admin replies; customer sees it', async () => {
  await c.goto(`${BASE}/contact`);
  await c.getByLabel('Subject').fill('Pickup timing');
  await c.getByLabel('Message').fill('When will the return pickup be scheduled?');
  await c.getByRole('button', { name: 'Send message' }).click();
  await c.getByText('has been received').waitFor();
  await a.goto(`${BASE}/admin/support`);
  await a.getByRole('button', { name: /Pickup timing/ }).first().click();
  await a.getByLabel('Reply').fill('Our courier partner will call you tomorrow.');
  await a.getByRole('button', { name: 'Send reply' }).click();
  await a.getByText('Reply sent').waitFor();
  await c.reload();
  await c.getByRole('button', { name: /Pickup timing/ }).click();
  await c.getByText('Our courier partner will call you tomorrow.').waitFor();
}, c);

await step('edit profile', async () => {
  await c.goto(`${BASE}/account/profile`);
  await c.getByRole('button', { name: 'Edit profile' }).click();
  await c.getByLabel('Full name').fill('UI Tester Jr');
  await c.getByRole('button', { name: 'Save changes' }).click();
  await c.getByText('Profile updated').waitFor();
  await c.getByText('UI Tester Jr').first().waitFor();
}, c);

await step('logout, then protected pages ask for sign-in', async () => {
  await c.getByRole('button', { name: 'Logout' }).click();
  await c.waitForURL(`${BASE}/`);
  await c.goto(`${BASE}/account/orders`);
  await c.waitForURL(/\/login\?redirect=/);
}, c);

await step('login returns to the page originally requested', async () => {
  await c.locator('input[type=email]').fill(email);
  await c.locator('input[type=password]').fill(password);
  await c.getByRole('button', { name: 'Sign in' }).click();
  await c.waitForURL(/\/account\/orders$/);
}, c);

await step('guest cart merges into the account on login', async () => {
  const g = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  watch(g, 'guest');
  g.setDefaultTimeout(15000);
  await g.goto(`${BASE}/product/vitamin-c-serum`);
  await g.getByRole('button', { name: 'Add to Cart', exact: true }).click();
  await g.getByText('Added to cart').waitFor();
  await g.goto(`${BASE}/cart`);
  await g.getByText('Vitamin C Serum').first().waitFor(); // guest cart, priced by the server
  await g.screenshot({ path: `${OUT}j-guest-cart-390.png`, fullPage: true });
  await g.getByRole('button', { name: 'Proceed to Checkout' }).click();
  await g.waitForURL(/\/login\?redirect=/);
  await g.locator('input[type=email]').fill(email);
  await g.locator('input[type=password]').fill(password);
  await g.getByRole('button', { name: 'Sign in' }).click();
  await g.waitForURL(/\/checkout\/address/);
  await g.goto(`${BASE}/cart`);
  await g.getByText('Vitamin C Serum').first().waitFor();
  // Mobile screenshots of the checkout flow.
  for (const [name, path] of [['m-checkout-address', '/checkout/address'], ['m-checkout', '/checkout'], ['m-payment', '/checkout/payment'], ['m-orders', '/account/orders'], ['m-profile', '/account/profile']]) {
    await g.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await g.waitForTimeout(500);
    const overflow = await g.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) problems.push(`overflow-x ${overflow}px at 390px: ${path}`);
    await g.screenshot({ path: `${OUT}j-${name}-390.png`, fullPage: true });
  }
  await g.getByRole('button', { name: 'Open menu' }).click();
  await g.getByRole('dialog', { name: 'Menu' }).waitFor();
  await g.screenshot({ path: `${OUT}j-m-menu-390.png` });
}, c);

await browser.close();
console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length) console.log('Failed:\n' + failed.map((f) => `  - ${f}`).join('\n'));
console.log(problems.length ? `Browser problems:\n${[...new Set(problems)].join('\n')}` : 'No console errors, page errors, 5xx responses or mobile overflow.');
process.exit(failed.length || problems.length ? 1 : 0);
