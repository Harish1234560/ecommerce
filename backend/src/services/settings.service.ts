import { prisma } from '../database/prisma.js';

// Store configuration lives in store_settings as one JSON document per group.
// Payment gateway credentials are NOT stored here — they stay in environment variables.
export interface Settings {
  store: {
    name: string;
    tagline: string;
    logoUrl: string;
    email: string;
    phone: string;
    address: string;
    businessHours: string;
    mapEmbedUrl: string;
    gstin: string;
  };
  shipping: {
    defaultFee: number; // paise
    freeShippingThreshold: number; // paise; 0 disables free shipping
    processingDays: number;
    defaultMinDays: number;
    defaultMaxDays: number;
    deliverOutsideZones: boolean;
  };
  tax: {
    pricesIncludeTax: boolean;
    defaultRate: number; // percent
  };
  payment: {
    codEnabled: boolean;
    onlineEnabled: boolean;
    codMaxAmount: number; // paise; 0 = no limit
    pendingPaymentExpiryMinutes: number;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
  };
  social: {
    instagram: string;
    youtube: string;
    facebook: string;
    twitter: string;
    whatsapp: string;
  };
  policies: {
    returnWindowDays: number;
    reviewRequiresApproval: boolean;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  store: {
    name: 'ShopHub',
    tagline: 'Everyday essentials, thoughtfully chosen',
    logoUrl: '',
    email: 'support@shophub.local',
    phone: '+91 98765 43210',
    address: '123 Commerce Street, Fort, Mumbai, Maharashtra 400001',
    businessHours: 'Mon–Sat: 9:00 AM – 9:00 PM',
    mapEmbedUrl: 'https://www.google.com/maps?q=Fort,+Mumbai&output=embed',
    gstin: '',
  },
  shipping: {
    defaultFee: 5000,
    freeShippingThreshold: 50000,
    processingDays: 1,
    defaultMinDays: 4,
    defaultMaxDays: 7,
    deliverOutsideZones: true,
  },
  tax: { pricesIncludeTax: true, defaultRate: 18 },
  payment: { codEnabled: true, onlineEnabled: true, codMaxAmount: 2500000, pendingPaymentExpiryMinutes: 30 },
  notifications: { emailEnabled: true, smsEnabled: false, pushEnabled: false },
  social: { instagram: '', youtube: '', facebook: '', twitter: '', whatsapp: '' },
  policies: { returnWindowDays: 7, reviewRequiresApproval: false },
};

export type SettingsKey = keyof Settings;
export const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingsKey[];

let cache: Settings | null = null;

export async function getSettings(): Promise<Settings> {
  if (cache) return cache;
  const rows = await prisma.storeSetting.findMany();
  const merged = structuredClone(DEFAULT_SETTINGS) as Settings;
  for (const row of rows) {
    if ((SETTINGS_KEYS as string[]).includes(row.key) && row.value && typeof row.value === 'object') {
      const key = row.key as SettingsKey;
      (merged as unknown as Record<string, unknown>)[key] = { ...merged[key], ...(row.value as object) };
    }
  }
  cache = merged;
  return merged;
}

export async function updateSettings<K extends SettingsKey>(key: K, value: Settings[K]): Promise<Settings> {
  await prisma.storeSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
  cache = null;
  return getSettings();
}

export function invalidateSettings() {
  cache = null;
}
