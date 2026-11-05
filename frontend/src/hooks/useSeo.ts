import { useSettings } from '@/hooks/useSettings';
import { useEffect } from 'react';

interface SeoOptions {
  title?: string;
  description?: string;
  image?: string | null;
  /** Private or duplicate pages (cart, account, search results…) are kept out of search engines. */
  noindex?: boolean;
  type?: 'website' | 'product';
  /** Schema.org structured data for this page; one object or several. */
  jsonLd?: object | object[] | null;
}

// Page metadata: title, description, canonical URL, Open Graph / Twitter tags and JSON-LD.
// The server fills the same tags into the first HTML response (backend seo.service.ts); this hook
// keeps them correct as the customer moves between pages without a reload.
export function useSeo(opts: SeoOptions) {
  const { data: settings } = useSettings();
  const storeName = settings?.store.name ?? 'ShopHub';
  const { title, description, image, noindex, type } = opts;
  const jsonLd = opts.jsonLd ? JSON.stringify(Array.isArray(opts.jsonLd) ? opts.jsonLd : [opts.jsonLd]) : null;

  useEffect(() => {
    const fullTitle = title ? `${title} | ${storeName}` : `${storeName} — ${settings?.store.tagline ?? 'Online store'}`;
    document.title = fullTitle;
    const upsert = (selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void) => {
      let el = document.head.querySelector<HTMLElement>(selector);
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      apply(el);
    };
    const meta = (attr: 'name' | 'property', key: string, content: string | null | undefined) => {
      if (!content) {
        document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
        return;
      }
      upsert(
        `meta[${attr}="${key}"]`,
        () => {
          const m = document.createElement('meta');
          m.setAttribute(attr, key);
          return m;
        },
        (el) => el.setAttribute('content', content),
      );
    };
    // The canonical URL never includes filters, sorting or paging.
    const url = window.location.origin + window.location.pathname;
    const imageUrl = image ? new URL(image, window.location.origin).href : null;
    meta('name', 'description', description);
    meta('name', 'robots', noindex ? 'noindex, nofollow' : null);
    meta('property', 'og:title', fullTitle);
    meta('property', 'og:description', description);
    meta('property', 'og:type', type ?? 'website');
    meta('property', 'og:url', url);
    meta('property', 'og:site_name', storeName);
    meta('property', 'og:locale', 'en_IN');
    meta('property', 'og:image', imageUrl);
    meta('name', 'twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    meta('name', 'twitter:title', fullTitle);
    meta('name', 'twitter:description', description);
    meta('name', 'twitter:image', imageUrl);

    if (noindex) {
      document.head.querySelector('link[rel="canonical"]')?.remove();
    } else {
      upsert(
        'link[rel="canonical"]',
        () => {
          const l = document.createElement('link');
          l.setAttribute('rel', 'canonical');
          return l;
        },
        (el) => el.setAttribute('href', url),
      );
    }

    document.head.querySelectorAll('script[data-seo="jsonld"]').forEach((el) => el.remove());
    if (jsonLd && !noindex) {
      for (const data of JSON.parse(jsonLd) as object[]) {
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.dataset.seo = 'jsonld';
        s.textContent = JSON.stringify(data);
        document.head.appendChild(s);
      }
    }
  }, [title, description, image, noindex, type, jsonLd, storeName, settings?.store.tagline]);
}

const origin = () => window.location.origin;

/** BreadcrumbList structured data; `path` values are site-relative. */
export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: origin() + item.path })),
  };
}
