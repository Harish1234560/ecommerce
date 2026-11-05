// Registers the service worker (public/sw.js) in production builds only, so development always
// talks to the live Vite server. The worker never caches API responses or account pages.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* installability is optional; the shop works without it */
    });
  });
}
