// Shared setup for the browser tests.
// They drive an installed browser through playwright-core, so no browser download is needed:
// Microsoft Edge on Windows, Google Chrome elsewhere. Override with E2E_BROWSER_CHANNEL.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

/** Where the app under test is served. `npm run test:e2e` sets this to the test stack. */
export const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';
export const API = `${BASE}/api/v1`;

/** Screenshots land in frontend/test-results (git-ignored). */
export const OUT = fileURLToPath(new URL('../../test-results/', import.meta.url));
mkdirSync(OUT, { recursive: true });

/** Seeded accounts (see backend/prisma/seed.ts). */
export const ADMIN = { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@shophub.local', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345' };
export const CUSTOMER = { email: 'priya@example.com', password: 'Customer@123' };

export function launchBrowser() {
  const channel = process.env.E2E_BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : 'chrome');
  return chromium.launch({ channel, headless: true });
}
