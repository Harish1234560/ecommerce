// Mobile load check: opens key pages on an emulated phone with a throttled network and CPU and
// reports First Contentful Paint, Largest Contentful Paint, Cumulative Layout Shift and page weight.
// Fails when a page misses the Core Web Vitals targets (LCP < 2.5s, CLS < 0.1).
// Usage: node vitals.mjs            (E2E_NETWORK=slow4g|fast4g, default fast4g)
import { API, BASE, launchBrowser } from './browser.mjs';

const NETWORKS = {
  // Chrome DevTools presets: latency in ms, throughput in bytes per second.
  slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
  fast4g: { latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (9 * 1024 * 1024) / 8 },
};
const networkName = process.env.E2E_NETWORK ?? 'fast4g';
const network = NETWORKS[networkName];
const CPU_SLOWDOWN = 4;
const LCP_TARGET = networkName === 'slow4g' ? 4000 : 2500;
const PAGES = [['Home', '/'], ['Products', '/products'], ['Product', '/product/vitamin-c-serum'], ['Category', '/category/beauty']];

// Warm the server (database connections, caches) so the first page is not charged for a cold start.
for (const [, path] of PAGES) await fetch(`${BASE}${path}`).catch(() => {});
await fetch(`${API}/home`).catch(() => {});

const browser = await launchBrowser();
let failed = false;
console.log(`Emulated phone (390×844), ${networkName}, ${CPU_SLOWDOWN}× CPU slowdown\n`);

for (const [name, path] of PAGES) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...network });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });

  let bytes = 0;
  let scriptBytes = 0;
  let imageBytes = 0;
  let requests = 0;
  const types = new Map();
  cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));
  cdp.on('Network.loadingFinished', (e) => {
    requests++;
    bytes += e.encodedDataLength;
    if (types.get(e.requestId) === 'Script') scriptBytes += e.encodedDataLength;
    if (types.get(e.requestId) === 'Image') imageBytes += e.encodedDataLength;
  });

  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, cls: 0, fcp: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__vitals.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__vitals.cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (entry.name === 'first-contentful-paint') window.__vitals.fcp = entry.startTime;
    }).observe({ type: 'paint', buffered: true });
  });

  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  const v = await page.evaluate(() => window.__vitals);
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  const ok = v.lcp > 0 && v.lcp < LCP_TARGET && v.cls < 0.1;
  if (!ok) failed = true;
  console.log(`${ok ? '✓' : '✗'} ${name.padEnd(9)} FCP ${(v.fcp / 1000).toFixed(2)}s   LCP ${(v.lcp / 1000).toFixed(2)}s   CLS ${v.cls.toFixed(3)}   ${requests} requests, ${kb(bytes)} total (JS ${kb(scriptBytes)}, images ${kb(imageBytes)})`);
  await context.close();
}

await browser.close();
console.log(failed ? `\nSome pages missed the targets (LCP < ${LCP_TARGET / 1000}s, CLS < 0.1).` : `\nAll pages meet the targets (LCP < ${LCP_TARGET / 1000}s, CLS < 0.1).`);
process.exit(failed ? 1 : 0);
