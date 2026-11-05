// SEO and delivery checks on the raw server responses — what a crawler or link preview sees
// without running any JavaScript — plus the PWA files and caching headers.
import { API, BASE } from './browser.mjs';

let passed = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else failures.push(name);
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : `  →  ${String(detail).slice(0, 200)}`}`);
};
const get = async (path, headers = {}) => {
  const res = await fetch(`${BASE}${path}`, { headers, redirect: 'manual' });
  return { res, text: await res.text() };
};
const tag = (html, re) => re.exec(html)?.[1] ?? null;
const title = (html) => tag(html, /<title>([^<]*)<\/title>/);
const description = (html) => tag(html, /<meta name="description" content="([^"]*)"/);
const canonical = (html) => tag(html, /<link rel="canonical" href="([^"]*)"/);
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const types = (html) => jsonLd(html).map((d) => d['@type']);

const product = (await fetch(`${API}/products?limit=1&sort=rating`).then((r) => r.json())).data[0];
const category = (await fetch(`${API}/categories`).then((r) => r.json())).data[0];

console.log('\nHome page');
const home = await get('/');
check('200 with a unique title and description', home.res.status === 200 && !!title(home.text) && (description(home.text)?.length ?? 0) > 30, title(home.text));
check('canonical URL', canonical(home.text) === `${BASE}/`, canonical(home.text));
check('Open Graph and Twitter tags', /property="og:title"/.test(home.text) && /property="og:url"/.test(home.text) && /name="twitter:card"/.test(home.text));
check('Organization and WebSite structured data', types(home.text).includes('Organization') && types(home.text).includes('WebSite'), types(home.text));
check('hero image is preloaded', /<link rel="preload" as="image"[^>]*fetchpriority="high"/.test(home.text));

console.log('\nProduct page');
const p = await get(`/product/${product.slug}`);
const productLd = jsonLd(p.text).find((d) => d['@type'] === 'Product');
check('title contains the product name', p.res.status === 200 && (title(p.text) ?? '').includes(product.name), title(p.text));
check('title and description differ from the home page', title(p.text) !== title(home.text) && description(p.text) !== description(home.text));
check('canonical is the clean product URL', canonical(p.text) === `${BASE}/product/${product.slug}`, canonical(p.text));
check('query strings do not change the canonical', canonical((await get(`/product/${product.slug}?ref=ad&sort=x`)).text) === `${BASE}/product/${product.slug}`);
check('og:type product with an image', /property="og:type" content="product"/.test(p.text) && /property="og:image" content="http/.test(p.text));
check('Product structured data: name, price, currency, availability', productLd?.name === product.name && productLd?.offers?.priceCurrency === 'INR' && Number(productLd?.offers?.price) === product.sellingPrice / 100 && /schema\.org\/(InStock|OutOfStock)/.test(productLd?.offers?.availability ?? ''), JSON.stringify(productLd?.offers));
check('rating appears only when the product has reviews', product.ratingCount > 0 ? productLd?.aggregateRating?.reviewCount === product.ratingCount : !productLd?.aggregateRating);
check('BreadcrumbList structured data', types(p.text).includes('BreadcrumbList'));

console.log('\nCategory and static pages');
const c = await get(`/category/${category.slug}`);
check('category: title, description, canonical, breadcrumbs', c.res.status === 200 && (title(c.text) ?? '').includes(category.name) && canonical(c.text) === `${BASE}/category/${category.slug}` && types(c.text).includes('BreadcrumbList'), title(c.text));
const titles = new Set([title(home.text), title(p.text), title(c.text)]);
for (const path of ['/products', '/offers', '/about', '/contact', '/return-policy', '/shipping-policy', '/privacy', '/terms']) {
  const page = await get(path);
  titles.add(title(page.text));
  check(`${path}: indexable with its own title and canonical`, page.res.status === 200 && canonical(page.text) === `${BASE}${path}` && !/name="robots"/.test(page.text), title(page.text));
}
check('every public page has a different title', titles.size === 11, [...titles].join(' | '));

console.log('\nPrivate pages and 404s');
for (const path of ['/cart', '/checkout', '/account/orders', '/admin', '/login', '/search?q=shoes', '/wishlist']) {
  const page = await get(path);
  check(`${path}: noindex, no canonical`, /name="robots" content="noindex/.test(page.text) && !canonical(page.text));
}
check('unknown URL answers 404 and noindex', await get('/no-such-page').then((r) => r.res.status === 404 && /noindex/.test(r.text)));
check('unknown product answers 404', (await get('/product/no-such-product')).res.status === 404);
check('unknown API route answers JSON 404', await get('/api/v1/nope').then((r) => r.res.status === 404 && JSON.parse(r.text).success === false));

console.log('\nrobots.txt and sitemap.xml');
const robots = (await get('/robots.txt')).text;
check('robots.txt blocks private areas and links the sitemap', ['/admin', '/account', '/checkout', '/cart'].every((x) => robots.includes(`Disallow: ${x}`)) && robots.includes('Sitemap:') && robots.includes('Allow: /'));
const sitemap = (await get('/sitemap.xml')).text;
check('sitemap lists home, products and categories', sitemap.includes(`<loc>${BASE}/</loc>`) && sitemap.includes(`/product/${product.slug}</loc>`) && sitemap.includes(`/category/${category.slug}</loc>`));
check('sitemap has no private pages', !/\/(cart|checkout|account|admin|login|search)/.test(sitemap));

console.log('\nDelivery');
const compressed = await fetch(`${API}/home`, { headers: { 'Accept-Encoding': 'gzip, br' } });
check('API responses are compressed', ['gzip', 'br'].includes(compressed.headers.get('content-encoding') ?? ''), compressed.headers.get('content-encoding'));
check('public catalogue responses are cacheable', /public, max-age=\d+/.test(compressed.headers.get('cache-control') ?? ''), compressed.headers.get('cache-control'));
check('private API responses are never cached', (await fetch(`${API}/auth/session`)).headers.get('cache-control') === 'no-store');
const asset = tag(home.text, /src="(\/assets\/[^"]+\.js)"/);
check('hashed build files are cached for a year', /max-age=31536000, immutable/.test((await fetch(`${BASE}${asset}`)).headers.get('cache-control') ?? ''));
check('HTML is always revalidated', home.res.headers.get('cache-control') === 'no-cache');

console.log('\nInstallable app (PWA)');
const manifest = await fetch(`${BASE}/manifest.webmanifest`).then((r) => r.json()).catch(() => null);
check('web manifest with name, colours and icons', !!manifest?.name && manifest.display === 'standalone' && !!manifest.theme_color && manifest.icons?.some((i) => i.sizes === '512x512') && manifest.icons?.some((i) => i.purpose === 'maskable'));
for (const icon of manifest?.icons ?? []) check(`icon ${icon.src}`, (await fetch(`${BASE}${icon.src}`)).headers.get('content-type') === 'image/png');
const sw = await fetch(`${BASE}/sw.js`);
const swText = await sw.text();
check('service worker is served and always revalidated', sw.status === 200 && sw.headers.get('cache-control') === 'no-cache');
check('service worker never handles API requests', swText.includes("url.pathname.startsWith('/api/')"));
check('offline page', await get('/offline.html').then((r) => r.res.status === 200 && r.text.includes('You are offline')));
check('manifest and theme colour are linked from the page', /rel="manifest"/.test(home.text) && /name="theme-color"/.test(home.text));

console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
