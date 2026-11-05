import type { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { notFound } from '../utils/errors.js';
import { cardSelect, listCategories, toCard, visibleProduct } from './catalog.service.js';
import { getSettings } from './settings.service.js';
import { addDays, quoteShipping } from './shipping.service.js';

// Storefront content that is not the catalogue itself: homepage, offers, editable pages, public settings.

const HOME_PRODUCTS = 10;
const DEAL_MIN_DISCOUNT = 20;

function activeOffersWhere(): Prisma.CouponWhereInput {
  const now = new Date();
  return { isActive: true, showOnOffers: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

const offerSelect = {
  id: true,
  code: true,
  description: true,
  discountType: true,
  value: true,
  minOrder: true,
  maxDiscount: true,
  expiresAt: true,
  products: { select: { name: true, slug: true }, take: 6 },
  categories: { select: { name: true, slug: true } },
} satisfies Prisma.CouponSelect;

export async function getHome() {
  const now = new Date();
  const [banners, sections, categories, featured, trending, bestSellers, offers, testimonials] = await Promise.all([
    prisma.banner.findMany({
      where: { isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.homepageSection.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    listCategories(),
    prisma.product.findMany({ where: { AND: [visibleProduct, { featured: true }] }, select: cardSelect, orderBy: { salesCount: 'desc' }, take: HOME_PRODUCTS }),
    prisma.product.findMany({ where: { AND: [visibleProduct, { isTrending: true }] }, select: cardSelect, orderBy: { updatedAt: 'desc' }, take: HOME_PRODUCTS }),
    prisma.product.findMany({
      where: { AND: [visibleProduct, { OR: [{ isBestSeller: true }, { salesCount: { gt: 0 } }] }] },
      select: cardSelect,
      orderBy: [{ salesCount: 'desc' }],
      take: HOME_PRODUCTS,
    }),
    prisma.coupon.findMany({ where: activeOffersWhere(), select: offerSelect, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 6 }),
  ]);
  return {
    banners: { hero: banners.filter((b) => b.type === 'HERO'), promo: banners.filter((b) => b.type === 'PROMO') },
    sections: sections.map((s) => ({ key: s.key, title: s.title, subtitle: s.subtitle })),
    categories,
    featured: featured.map(toCard),
    trending: trending.map(toCard),
    bestSellers: bestSellers.map(toCard),
    offers,
    testimonials,
  };
}

export async function getOffers() {
  const [coupons, deals, byCategory] = await Promise.all([
    prisma.coupon.findMany({ where: activeOffersWhere(), select: offerSelect, orderBy: { createdAt: 'desc' } }),
    prisma.product.findMany({
      where: { AND: [visibleProduct, { discountPercent: { gte: DEAL_MIN_DISCOUNT }, stock: { gt: 0 } }] },
      select: cardSelect,
      orderBy: { discountPercent: 'desc' },
      take: 12,
    }),
    prisma.product.groupBy({
      by: ['categoryId'],
      where: { AND: [visibleProduct, { discountPercent: { gt: 0 } }] },
      _max: { discountPercent: true },
      _count: { _all: true },
    }),
  ]);
  const categories = await prisma.category.findMany({ where: { id: { in: byCategory.map((c) => c.categoryId) }, isActive: true } });
  const categoryOffers = byCategory
    .map((g) => {
      const c = categories.find((x) => x.id === g.categoryId);
      return c ? { name: c.name, slug: c.slug, imageUrl: c.imageUrl, maxDiscount: g._max.discountPercent ?? 0, productCount: g._count._all } : null;
    })
    .filter((x) => x !== null)
    .sort((a, b) => b.maxDiscount - a.maxDiscount);
  return { coupons, deals: deals.map(toCard), categoryOffers };
}

export async function getContentPage(slug: string) {
  const page = await prisma.contentPage.findUnique({ where: { slug } });
  if (!page) throw notFound('Page');
  return { slug: page.slug, title: page.title, body: page.body, data: page.data, updatedAt: page.updatedAt };
}

// Store configuration that is safe to show to anyone. Never includes secrets.
export async function getPublicSettings() {
  const s = await getSettings();
  return {
    store: s.store,
    social: s.social,
    shipping: { defaultFee: s.shipping.defaultFee, freeShippingThreshold: s.shipping.freeShippingThreshold },
    payment: { codEnabled: s.payment.codEnabled, onlineEnabled: s.payment.onlineEnabled, codMaxAmount: s.payment.codMaxAmount },
    tax: { pricesIncludeTax: s.tax.pricesIncludeTax },
    policies: { returnWindowDays: s.policies.returnWindowDays },
  };
}

export async function checkDelivery(pincode: string) {
  const quote = await quoteShipping(pincode);
  const now = new Date();
  return {
    pincode,
    deliverable: quote.deliverable,
    codAvailable: quote.codAvailable,
    fee: quote.fee,
    freeAbove: quote.freeAbove,
    estimatedFrom: addDays(now, quote.minDays),
    estimatedTo: addDays(now, quote.maxDays),
  };
}

export async function subscribeNewsletter(email: string) {
  await prisma.newsletterSubscriber.upsert({ where: { email }, create: { email }, update: {} });
}
