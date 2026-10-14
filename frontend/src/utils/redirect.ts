
// Only allow same-site redirect targets (never an absolute URL from the query string).
export function safeRedirect(value: string | null, fallback = '/'): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}
