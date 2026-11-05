import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import { cached } from '../utils/cache.js';
import { responsiveImage } from '../utils/image.js';
import { visibleProduct } from './catalog.service.js';
import { getSettings } from './settings.service.js';
import { getHome } from './storefront.service.js';

// Server-side page metadata. The storefront is a single-page app, so the API fills the <head> of
// index.html (title, description, canonical, Open Graph, Twitter and JSON-LD) for the requested URL
// before sending it. Crawlers and link previews that do not run JavaScript get correct metadata;
// the browser then keeps the same tags up to date as the customer navigates (hooks/useSeo.ts).

export interface PageSeo {
  status: 200 | 404;
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: 'website' | 'product';
  noindex?: boolean;
  jsonLd?: object[];
  /** The page's main above-the-fold image, preloaded so it starts downloading with the HTML. */
  preload?: { src: string; srcSet?: string; sizes?: string };
}

const base = env.CLIENT_URL.replace(/\/$/, '');
const abs = (pathOrUrl: string) => (/^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`);
const clip = (text: string, max = 160) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
};

const STATIC_PAGES: Record<string, { title: string; description: (store: string) => string }> = {
  '/products': { title: 'All Products', description: () => 'Browse our full catalogue. Filter by category, price, rating, brand and discount.' },
  '/offers': { title: 'Offers & Deals', description: (s) => `Current coupons, deals and discounts at ${s}.` },
  '/about': { title: 'About Us', description: (s) => `The story behind ${s}: who we are, what we sell and how we choose it.` },
  '/contact': { title: 'Contact Us', description: (s) => `Get in touch with ${s} — phone, email, address and business hours.` },
  '/return-policy': { title: 'Return & Refund Policy', description: (s) => `How returns, replacements and refunds work at ${s}.` },
  '/shipping-policy': { title: 'Shipping Policy', description: (s) => `Delivery areas, charges, timelines and cash-on-delivery rules at ${s}.` },
  '/privacy': { title: 'Privacy Policy', description: (s) => `How ${s} collects, uses and protects your information.` },
  '/terms': { title: 'Terms & Conditions', description: (s) => `The terms that apply when you shop at ${s}.` },
};

// App routes that exist but must never be indexed.
const PRIVATE_PREFIXES = ['/admin', '/account', '/checkout', '/cart', '/wishlist', '/order', '/search', '/login', '/register', '/forgot-password', '/reset-password'];

const breadcrumbs = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: abs(item.path) })),
});

async function productSeo(slug: string, store: string): Promise<PageSeo | null> {
  const p = await prisma.product.findFirst({
    where: { AND: [visibleProduct, { slug }] },
    select: {
      name: true, slug: true, sku: true, description: true, brand: true, sellingPrice: true, stock: true, ratingAvg: true, ratingCount: true,
      category: { select: { name: true, slug: true } },
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], select: { url: true }, take: 6 },
      reviews: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 3, select: { rating: true, title: true, comment: true, createdAt: true, user: { select: { name: true } } } },
    },
  });
  if (!p) return null;
  const path = `/product/${p.slug}`;
  const images = p.images.map((i) => abs(i.url));
  return {
    status: 200,
    title: `${p.name}${p.brand ? ` by ${p.brand}` : ''} | ${store}`,
    description: clip(p.description),
    path,
    image: images[0],
    type: 'product',
    preload: p.images[0] ? responsiveImage(p.images[0].url, 'gallery') : undefined,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: clip(p.description, 500),
        sku: p.sku,
        image: images,
        category: p.category.name,
        ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
        // Ratings and reviews are included only when real, approved reviews exist.
        ...(p.ratingCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(p.ratingAvg.toFixed(1)), reviewCount: p.ratingCount } } : {}),
        ...(p.reviews.length > 0
          ? {
              review: p.reviews.map((r) => ({
                '@type': 'Review',
                reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
                author: { '@type': 'Person', name: r.user.name },
                datePublished: r.createdAt.toISOString().slice(0, 10),
                ...(r.title ? { name: r.title } : {}),
                reviewBody: clip(r.comment, 500),
              })),
            }
          : {}),
        offers: {
          '@type': 'Offer',
          url: abs(path),
          priceCurrency: 'INR',
          price: (p.sellingPrice / 100).toFixed(2),
          availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      },
      breadcrumbs([{ name: 'Home', path: '/' }, { name: p.category.name, path: `/category/${p.category.slug}` }, { name: p.name, path }]),
    ],
  };
}

async function categorySeo(slug: string, store: string): Promise<PageSeo | null> {
  const c = await prisma.category.findFirst({ where: { slug, isActive: true }, select: { name: true, slug: true, description: true, imageUrl: true, bannerUrl: true } });
  if (!c) return null;
  const path = `/category/${c.slug}`;
  return {
    status: 200,
    title: `${c.name} — Shop Online | ${store}`,
    description: clip(c.description || `Shop ${c.name} at ${store}. Fast delivery, secure payments and easy returns.`),
    path,
    image: c.bannerUrl ?? c.imageUrl,
    jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: c.name, path }])],
  };
}

export async function resolveSeo(rawPath: string): Promise<PageSeo> {
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : '/';
  const settings = await getSettings();
  const store = settings.store.name;
  const fallbackDescription = `${settings.store.tagline}. Fast delivery, secure payments and easy returns.`;

  if (path === '/') {
    const hero = (await cached('home', getHome)).banners.hero[0];
    const social = Object.values(settings.social).filter((u) => /^https?:\/\//.test(u));
    return {
      status: 200,
      title: `${store} — ${settings.store.tagline}`,
      description: clip(fallbackDescription),
      path,
      image: settings.store.logoUrl || null,
      preload: hero ? responsiveImage(hero.imageUrl, 'banner') : undefined,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: store,
          url: base,
          ...(settings.store.logoUrl ? { logo: abs(settings.store.logoUrl) } : {}),
          ...(settings.store.email || settings.store.phone
            ? { contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', ...(settings.store.phone ? { telephone: settings.store.phone } : {}), ...(settings.store.email ? { email: settings.store.email } : {}) } }
            : {}),
          ...(social.length ? { sameAs: social } : {}),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: store,
          url: base,
          potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${base}/search?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
        },
      ],
    };
  }

  const page = STATIC_PAGES[path];
  if (page) {
    return { status: 200, title: `${page.title} | ${store}`, description: page.description(store), path, jsonLd: [breadcrumbs([{ name: 'Home', path: '/' }, { name: page.title, path }])] };
  }

  const product = /^\/product\/([^/]+)$/.exec(path);
  if (product) {
    const slug = decodeURIComponent(product[1]!);
    const seo = await cached(`seo:product:${slug}`, () => productSeo(slug, store));
    if (seo) return seo;
  }
  const category = /^\/category\/([^/]+)$/.exec(path);
  if (category) {
    const slug = decodeURIComponent(category[1]!);
    const seo = await cached(`seo:category:${slug}`, () => categorySeo(slug, store));
    if (seo) return seo;
  }

  if (PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return { status: 200, title: store, description: clip(fallbackDescription), path, noindex: true };
  }
  // Anything else is not a page of this site: answer 404 so it is never indexed as a "soft 404".
  return { status: 404, title: `Page Not Found | ${store}`, description: clip(fallbackDescription), path, noindex: true };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The tags that replace the `<!--seo-->…<!--/seo-->` block of index.html. */
export function renderSeoHead(seo: PageSeo, storeName: string): string {
  const url = abs(seo.path);
  const preload = seo.preload;
  const preloadOrigin = preload && /^https?:\/\//.test(preload.src) ? new URL(preload.src).origin : null;
  const tags = [
    ...(preloadOrigin ? [`<link rel="preconnect" href="${esc(preloadOrigin)}" />`] : []),
    ...(preload
      ? [`<link rel="preload" as="image" href="${esc(preload.src)}"${preload.srcSet ? ` imagesrcset="${esc(preload.srcSet)}" imagesizes="${esc(preload.sizes ?? '100vw')}"` : ''} fetchpriority="high" />`]
      : []),
    `<title>${esc(seo.title)}</title>`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    ...(seo.noindex ? ['<meta name="robots" content="noindex, nofollow" />'] : [`<link rel="canonical" href="${esc(url)}" />`]),
    `<meta property="og:title" content="${esc(seo.title)}" />`,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    `<meta property="og:type" content="${seo.type ?? 'website'}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:site_name" content="${esc(storeName)}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    ...(seo.image ? [`<meta property="og:image" content="${esc(abs(seo.image))}" />`] : []),
    `<meta name="twitter:card" content="${seo.image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(seo.title)}" />`,
    `<meta name="twitter:description" content="${esc(seo.description)}" />`,
    ...(seo.image ? [`<meta name="twitter:image" content="${esc(abs(seo.image))}" />`] : []),
    // "<" is escaped so the JSON can never close the script element early.
    ...(seo.noindex ? [] : (seo.jsonLd ?? []).map((data) => `<script type="application/ld+json" data-seo="jsonld">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`)),
  ];
  return tags.join('\n    ');
}
