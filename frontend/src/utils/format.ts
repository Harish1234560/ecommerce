
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const inrExact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Amounts arrive in paise. Whole rupees are shown without decimals.
export function money(paise: number): string {
  return paise % 100 === 0 ? inr.format(paise / 100) : inrExact.format(paise / 100);
}

export function compactMoney(paise: number): string {
  const r = paise / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(2)} Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(2)} L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(1)}K`;
  return inr.format(r);
}

export const toPaise = (rupees: string | number): number => Math.round(Number(rupees || 0) * 100);

export const toRupees = (paise: number | null | undefined): string => (paise == null ? '' : String(paise / 100));

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', opts);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(value: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export const titleCase = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
