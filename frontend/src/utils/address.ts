import type { Address } from '@/types';

export function formatAddress(a: Pick<Address, 'address' | 'apartment' | 'street' | 'city' | 'state' | 'pincode' | 'landmark'>): string {
  return [a.apartment, a.address, a.street, a.landmark ? `Near ${a.landmark}` : null, `${a.city}, ${a.state} ${a.pincode}`].filter(Boolean).join(', ');
}
