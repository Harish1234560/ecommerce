import { useSettings } from '@/hooks/useSettings';
import { useEffect } from 'react';

// Page metadata: title, description, canonical URL, Open Graph tags and optional JSON-LD.
export function useSeo(opts: { title?: string; description?: string; image?: string | null; noindex?: boolean; jsonLd?: object | null }) {
  const { data: settings } = useSettings();
  const storeName = settings?.store.name ?? 'ShopHub';
  const { title, description, image, noindex } = opts;
  const jsonLd = opts.jsonLd ? JSON.stringify(opts.jsonLd) : null;

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
    const url = window.location.origin + window.location.pathname;
    meta('name', 'description', description);
    meta('name', 'robots', noindex ? 'noindex, nofollow' : null);
    meta('property', 'og:title', fullTitle);
    meta('property', 'og:description', description);
    meta('property', 'og:type', jsonLd ? 'product' : 'website');
    meta('property', 'og:url', url);
    meta('property', 'og:site_name', storeName);
    meta('property', 'og:image', image ? new URL(image, window.location.origin).href : null);
    meta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    upsert(
      'link[rel="canonical"]',
      () => {
        const l = document.createElement('link');
        l.setAttribute('rel', 'canonical');
        return l;
      },
      (el) => el.setAttribute('href', url),
    );
    document.getElementById('jsonld')?.remove();
    if (jsonLd) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'jsonld';
      s.textContent = jsonLd;
      document.head.appendChild(s);
    }
  }, [title, description, image, noindex, jsonLd, storeName, settings?.store.tagline]);
}
