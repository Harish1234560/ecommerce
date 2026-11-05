import { prisma } from '../database/prisma.js';
import { getSettings } from './settings.service.js';

export interface ShippingQuote {
  deliverable: boolean;
  zone: string | null;
  fee: number; // fee before the free-shipping rule
  freeAbove: number | null;
  minDays: number;
  maxDays: number;
  codAvailable: boolean;
}

// Finds the delivery zone for a PIN code (longest matching prefix wins); falls back to store defaults.
export async function quoteShipping(pincode?: string | null): Promise<ShippingQuote> {
  const settings = await getSettings();
  const s = settings.shipping;
  const fallback: ShippingQuote = {
    deliverable: true,
    zone: null,
    fee: s.defaultFee,
    freeAbove: s.freeShippingThreshold > 0 ? s.freeShippingThreshold : null,
    minDays: s.processingDays + s.defaultMinDays,
    maxDays: s.processingDays + s.defaultMaxDays,
    codAvailable: settings.payment.codEnabled,
  };
  if (!pincode) return fallback;

  const zones = await prisma.shippingZone.findMany({ where: { isActive: true } });
  let best: { zone: (typeof zones)[number]; len: number } | null = null;
  for (const zone of zones) {
    for (const prefix of zone.pincodePrefixes) {
      if (prefix && pincode.startsWith(prefix) && (!best || prefix.length > best.len)) best = { zone, len: prefix.length };
    }
  }
  if (!best) return s.deliverOutsideZones ? fallback : { ...fallback, deliverable: false, codAvailable: false };

  return {
    deliverable: true,
    zone: best.zone.name,
    fee: best.zone.fee,
    freeAbove: best.zone.freeAbove ?? fallback.freeAbove,
    minDays: s.processingDays + best.zone.minDays,
    maxDays: s.processingDays + best.zone.maxDays,
    codAvailable: settings.payment.codEnabled && best.zone.codAvailable,
  };
}

export function shippingFeeFor(quote: ShippingQuote, amount: number): number {
  if (amount <= 0) return 0;
  if (quote.freeAbove !== null && amount >= quote.freeAbove) return 0;
  return quote.fee;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
