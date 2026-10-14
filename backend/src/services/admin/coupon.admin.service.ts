import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { conflict, notFound } from '../../utils/errors.js';
import type { CouponInput } from '../../validators/adminContent.validators.js';
import { notifyAllCustomers } from '../notification.service.js';

const include = {
  products: { select: { id: true, name: true } },
  categories: { select: { id: true, name: true } },
  _count: { select: { usages: true } },
} satisfies Prisma.CouponInclude;

function couponData(input: CouponInput) {
  return {
    code: input.code,
    description: input.description,
    discountType: input.discountType,
    value: input.value,
    minOrder: input.minOrder,
    // A cap only makes sense for percentage discounts.
    maxDiscount: input.discountType === 'PERCENTAGE' ? (input.maxDiscount ?? null) : null,
    startsAt: input.startsAt ?? new Date(),
    expiresAt: input.expiresAt ?? null,
    usageLimit: input.usageLimit || null,
    perUserLimit: input.perUserLimit || null,
    isActive: input.isActive,
    showOnOffers: input.showOnOffers,
  };
}

export function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, include });
}

export async function createCoupon(input: CouponInput) {
  if (await prisma.coupon.findUnique({ where: { code: input.code } })) throw conflict('A coupon with this code already exists');
  const coupon = await prisma.coupon.create({
    data: {
      ...couponData(input),
      products: { connect: input.productIds.map((id) => ({ id })) },
      categories: { connect: input.categoryIds.map((id) => ({ id })) },
    },
    include,
  });
  if (input.notifyCustomers && coupon.isActive) {
    const off = coupon.discountType === 'PERCENTAGE' ? `${coupon.value}% off` : `₹${coupon.value / 100} off`;
    await notifyAllCustomers('OFFER', `New offer: ${off}`, `Use code ${coupon.code} at checkout.${coupon.description ? ` ${coupon.description}` : ''}`, '/offers');
  }
  return coupon;
}

export async function updateCoupon(id: string, input: CouponInput) {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw notFound('Coupon');
  if (await prisma.coupon.findFirst({ where: { code: input.code, id: { not: existing.id } } })) throw conflict('A coupon with this code already exists');
  const coupon = await prisma.coupon.update({
    where: { id: existing.id },
    data: {
      ...couponData(input),
      products: { set: input.productIds.map((pid) => ({ id: pid })) },
      categories: { set: input.categoryIds.map((cid) => ({ id: cid })) },
    },
    include,
  });
  // Carts holding the old code would otherwise show a stale, invalid coupon.
  if (existing.code !== coupon.code) await prisma.cart.updateMany({ where: { couponCode: existing.code }, data: { couponCode: null } });
  return coupon;
}

export async function setCouponActive(id: string, isActive: boolean) {
  const coupon = await prisma.coupon.update({ where: { id }, data: { isActive } });
  return { id: coupon.id, code: coupon.code, isActive: coupon.isActive };
}

export async function deleteCoupon(id: string) {
  const existing = await prisma.coupon.findUnique({ where: { id }, include: { _count: { select: { usages: true } } } });
  if (!existing) throw notFound('Coupon');
  if (existing._count.usages > 0) throw conflict('This coupon has been used on orders. Deactivate it instead of deleting it.');
  await prisma.coupon.delete({ where: { id: existing.id } });
  await prisma.cart.updateMany({ where: { couponCode: existing.code }, data: { couponCode: null } });
  return existing;
}
