import { z } from 'zod';
import type { Settings } from '../services/settings.service.js';
import { idSchema, nullableDate, nullableInt, nullableText } from './common.js';

const sortOrder = z.coerce.number().int().min(0).max(9999).default(0);
const text = (max: number) => z.string().trim().max(max).default('');

// ───────────────────────── Coupons ─────────────────────────

export const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Use 3–30 letters, numbers, - or _'),
    description: nullableText(200),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.coerce.number().int().min(1, 'Enter a discount value'),
    minOrder: z.coerce.number().int().min(0).default(0),
    maxDiscount: nullableInt(100_000_000),
    startsAt: z.coerce.date().optional(),
    expiresAt: nullableDate,
    usageLimit: nullableInt(10_000_000),
    perUserLimit: nullableInt(1000),
    isActive: z.boolean().default(true),
    showOnOffers: z.boolean().default(true),
    productIds: z.array(idSchema).max(500).default([]),
    categoryIds: z.array(idSchema).max(100).default([]),
    notifyCustomers: z.boolean().optional(),
  })
  .refine((v) => v.discountType !== 'PERCENTAGE' || v.value <= 100, { path: ['value'], message: 'A percentage discount cannot exceed 100' })
  .refine((v) => !v.expiresAt || !v.startsAt || v.expiresAt > v.startsAt, { path: ['expiresAt'], message: 'Expiry must be after the start date' });
export type CouponInput = z.infer<typeof couponSchema>;

export const activeToggleSchema = z.object({ isActive: z.boolean() });

// ───────────────────────── Homepage content ─────────────────────────

export const bannerSchema = z
  .object({
    type: z.enum(['HERO', 'PROMO']).default('HERO'),
    title: z.string().trim().min(2, 'Title is required').max(120),
    subtitle: nullableText(240),
    imageUrl: z.string().trim().min(1, 'Upload an image').max(500),
    ctaText: nullableText(40),
    linkUrl: nullableText(300),
    startsAt: nullableDate,
    endsAt: nullableDate,
    isActive: z.boolean().default(true),
    sortOrder,
  })
  .refine((v) => !v.startsAt || !v.endsAt || v.endsAt > v.startsAt, { path: ['endsAt'], message: 'End date must be after the start date' });
export type BannerInput = z.infer<typeof bannerSchema>;

export const sectionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(80),
  subtitle: nullableText(200),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});
export type SectionInput = z.infer<typeof sectionSchema>;

export const testimonialSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(80),
  location: nullableText(80),
  text: z.string().trim().min(10, 'Write at least 10 characters').max(600),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  isActive: z.boolean().default(true),
  sortOrder,
});
export type TestimonialInput = z.infer<typeof testimonialSchema>;

// ───────────────────────── Announcements ─────────────────────────

// An in-app notification sent to every active customer. Links must stay on this site.
export const announcementSchema = z.object({
  type: z.enum(['OFFER', 'SYSTEM']).default('OFFER'),
  title: z.string().trim().min(3, 'Enter a title').max(80),
  message: z.string().trim().min(5, 'Enter a message').max(300),
  link: z
    .string()
    .trim()
    .max(200)
    .regex(/^\/(?!\/)\S*$/, 'Use a path on this site, for example /offers')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const pageSchemaInput = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  body: z.string().max(50_000).default(''),
  data: z.record(z.string(), z.unknown()).default({}),
});
export type PageInput = z.infer<typeof pageSchemaInput>;

// ───────────────────────── Settings ─────────────────────────

// One schema per settings group; the group key in the URL picks the schema.
export const settingsSchemas: { [K in keyof Settings]: z.ZodType<Settings[K]> } = {
  store: z.object({
    name: z.string().trim().min(1, 'Store name is required').max(60),
    tagline: text(120),
    logoUrl: text(500),
    email: z.string().trim().email('Enter a valid email').max(254),
    phone: text(30),
    address: text(300),
    businessHours: text(120),
    mapEmbedUrl: text(1000).refine((v) => v === '' || v.startsWith('https://www.google.com/maps'), 'Use a Google Maps embed URL (https://www.google.com/maps…)'),
    gstin: text(20),
  }),
  shipping: z
    .object({
      defaultFee: z.coerce.number().int().min(0).max(10_000_000),
      freeShippingThreshold: z.coerce.number().int().min(0).max(100_000_000),
      processingDays: z.coerce.number().int().min(0).max(30),
      defaultMinDays: z.coerce.number().int().min(0).max(60),
      defaultMaxDays: z.coerce.number().int().min(0).max(90),
      deliverOutsideZones: z.boolean(),
    })
    .refine((v) => v.defaultMaxDays >= v.defaultMinDays, { path: ['defaultMaxDays'], message: 'Max days must be at least min days' }),
  tax: z.object({ pricesIncludeTax: z.boolean(), defaultRate: z.coerce.number().min(0).max(100) }),
  payment: z
    .object({
      codEnabled: z.boolean(),
      onlineEnabled: z.boolean(),
      codMaxAmount: z.coerce.number().int().min(0).max(1_000_000_000),
      pendingPaymentExpiryMinutes: z.coerce.number().int().min(5).max(1440),
    })
    .refine((v) => v.codEnabled || v.onlineEnabled, { path: ['onlineEnabled'], message: 'Keep at least one payment method enabled' }),
  notifications: z.object({ emailEnabled: z.boolean(), smsEnabled: z.boolean(), pushEnabled: z.boolean() }),
  social: z.object({ instagram: text(300), youtube: text(300), facebook: text(300), twitter: text(300), whatsapp: text(30) }),
  policies: z.object({ returnWindowDays: z.coerce.number().int().min(0).max(90), reviewRequiresApproval: z.boolean() }),
};

export const shippingZoneSchema = z
  .object({
    name: z.string().trim().min(2, 'Zone name is required').max(60),
    pincodePrefixes: z.array(z.string().trim().regex(/^\d{1,6}$/, 'Prefixes must be 1–6 digits')).min(1, 'Add at least one PIN prefix').max(200),
    fee: z.coerce.number().int().min(0).max(10_000_000),
    freeAbove: nullableInt(100_000_000),
    minDays: z.coerce.number().int().min(0).max(60).default(3),
    maxDays: z.coerce.number().int().min(0).max(90).default(7),
    codAvailable: z.boolean().default(true),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.maxDays >= v.minDays, { path: ['maxDays'], message: 'Max days must be at least min days' });
export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>;

export const taxRuleSchema = z.object({
  name: z.string().trim().min(2, 'Rule name is required').max(60),
  rate: z.coerce.number().min(0).max(100),
  categoryId: idSchema.nullable().optional().transform((v) => v || null),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export type TaxRuleInput = z.infer<typeof taxRuleSchema>;
