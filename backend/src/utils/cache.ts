// Small in-process cache for public, non-personal storefront data (home page, categories, offers,
// settings). Entries expire after a short TTL so time-based content (banner schedules, coupon
// expiry) stays correct, and every successful admin change clears the whole cache.
// Never put anything user-specific in here.

interface Entry {
  value: Promise<unknown>;
  expires: number;
}

const entries = new Map<string, Entry>();
const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = 2000; // keys can come from URLs, so the cache must not grow without bound

export function cached<T>(key: string, load: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const now = Date.now();
  const hit = entries.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;
  if (entries.size >= MAX_ENTRIES) entries.clear();
  const value = load();
  entries.set(key, { value, expires: now + ttlMs });
  // A failed load is not cached.
  value.catch(() => entries.delete(key));
  return value;
}

export function invalidatePublicCache(): void {
  entries.clear();
}
