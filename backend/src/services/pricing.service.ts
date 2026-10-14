import type { Coupon } from '@prisma/client';
import { prisma, type Tx } from '../database/prisma.js';
import { getSettings } from './settings.service.js';
import { quoteShipping, shippingFeeFor, type ShippingQuote } from './shipping.service.js';

// Server-side cart pricing. Prices, stock, coupons, tax and shipping are always computed
// here from the database — nothing price-related is ever accepted from the client.

export interface LineInput {
  id?: string | null;
  productId: string;
  variantId?: string | null;
  quantity: number;
  savedForLater?: boolean;
}

export type LineIssue = 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';

export interface PricedLine {
  id: string | null;
  productId: string;
  variantId: string | null;
  inventoryId: string | null;
  categoryId: string | null;
  name: string;
  slug: string;
  image: string | null;
  brand: string | null;
  sku: string;
  variantLabel: string | null;
  mrp: number;
  unitPrice: number;
  quantity: number;
  lineMrp: number;
  lineTotal: number;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  availableStock: number;
  savedForLater: boolean;
  issue: LineIssue | null;
  issueMessage: string | null;
}

export interface CartSummary {
  itemCount: number;
  mrpTotal: number;
  discount: number;
  subtotal: number;
  couponCode: string | null;
  couponDiscount: number;
  shippingFee: number;
  freeShippingAbove: number | null;
  tax: number;
  taxInclusive: boolean;
  total: number;
}

export interface PricedCart {
  items: PricedLine[];
  saved: PricedLine[];
  summary: CartSummary;
  coupon: { code: string; description: string | null } | null;
  couponError: string | null;
  hasIssues: boolean;
  shipping: ShippingQuote;
}

function variantLabel(v: { size: string | null; color: string | null } | null): string | null {
  if (!v) return null;
  return [v.size ? `Size: ${v.size}` : null, v.color ? `Color: ${v.color}` : null].filter(Boolean).join(' · ') || null;
}

export interface CouponCheck {
  coupon: Coupon | null;
  discount: number;
  eligibleIndexes: number[];
  error: string | null;
}

export async function evaluateCoupon(
  db: Tx,
  code: string,
  userId: string | null,
  lines: Pick<PricedLine, 'productId' | 'categoryId' | 'lineTotal'>[],
): Promise<CouponCheck> {
  const fail = (error: string): CouponCheck => ({ coupon: null, discount: 0, eligibleIndexes: [], error });
  const coupon = await db.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { products: { select: { id: true } }, categories: { select: { id: true } } },
  });
  const now = new Date();
  if (!coupon || !coupon.isActive) return fail('This coupon code is not valid');
  if (coupon.startsAt > now) return fail('This coupon is not active yet');
  if (coupon.expiresAt && coupon.expiresAt < now) return fail('This coupon has expired');
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return fail('This coupon has reached its usage limit');
  if (coupon.perUserLimit !== null) {
    if (!userId) return fail('Sign in to use this coupon');
    const used = await db.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.perUserLimit) return fail('You have already used this coupon the maximum number of times');
  }

  const productIds = new Set(coupon.products.map((p) => p.id));
  const categoryIds = new Set(coupon.categories.map((c) => c.id));
  const restricted = productIds.size > 0 || categoryIds.size > 0;
  const eligibleIndexes: number[] = [];
  lines.forEach((line, i) => {
    if (!restricted || productIds.has(line.productId) || (line.categoryId && categoryIds.has(line.categoryId))) eligibleIndexes.push(i);
  });
  if (eligibleIndexes.length === 0) return fail('This coupon does not apply to the items in your cart');

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  if (subtotal < coupon.minOrder) {
    return fail(`Add items worth ₹${((coupon.minOrder - subtotal) / 100).toFixed(0)} more to use this coupon`);
  }
  const eligibleTotal = eligibleIndexes.reduce((s, i) => s + lines[i]!.lineTotal, 0);
  let discount = coupon.discountType === 'PERCENTAGE' ? Math.floor((eligibleTotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount !== null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.max(0, Math.min(discount, eligibleTotal));
  return { coupon, discount, eligibleIndexes, error: null };
}

export async function priceCart(
  lines: LineInput[],
  opts: { couponCode?: string | null; userId?: string | null; pincode?: string | null; db?: Tx } = {},
): Promise<PricedCart> {
  const db: Tx = opts.db ?? prisma;
  const settings = await getSettings();

  const productIds = [...new Set(lines.map((l) => l.productId))];
  const [products, taxRules] = await Promise.all([
    db.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: { select: { id: true, isActive: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        variants: { include: { inventory: true } },
        inventory: { where: { variantId: null } },
      },
    }),
    db.taxRule.findMany({ where: { isActive: true } }),
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const defaultRule = taxRules.find((r) => r.isDefault && !r.categoryId);

  const priced: PricedLine[] = lines.map((line) => {
    const product = byId.get(line.productId);
    const base: PricedLine = {
      id: line.id ?? null,
      productId: line.productId,
      variantId: line.variantId ?? null,
      inventoryId: null,
      categoryId: product?.categoryId ?? null,
      name: product?.name ?? 'Unavailable product',
      slug: product?.slug ?? '',
      image: product?.images[0]?.url ?? null,
      brand: product?.brand ?? null,
      sku: product?.sku ?? '',
      variantLabel: null,
      mrp: 0,
      unitPrice: 0,
      quantity: line.quantity,
      lineMrp: 0,
      lineTotal: 0,
      taxRate: 0,
      taxAmount: 0,
      netAmount: 0,
      availableStock: 0,
      savedForLater: !!line.savedForLater,
      issue: null,
      issueMessage: null,
    };
    const unavailable = (message: string): PricedLine => ({ ...base, issue: 'UNAVAILABLE', issueMessage: message });

    if (!product || product.deletedAt || product.status !== 'ACTIVE' || !product.category.isActive) {
      return unavailable('This product is no longer available');
    }
    const variant = line.variantId ? product.variants.find((v) => v.id === line.variantId) : null;
    if (product.hasVariants && (!variant || !variant.isActive)) return unavailable('This option is no longer available');
    if (!product.hasVariants && line.variantId) return unavailable('This option is no longer available');

    const inv = variant ? variant.inventory : product.inventory[0];
    const available = inv ? Math.max(inv.stock - inv.reserved, 0) : 0;
    const mrp = variant?.price ?? product.price;
    const unitPrice = Math.min(variant?.price != null ? (variant.discountPrice ?? variant.price) : product.sellingPrice, mrp);
    const taxRate =
      product.tax ?? taxRules.find((r) => r.categoryId === product.categoryId)?.rate ?? defaultRule?.rate ?? settings.tax.defaultRate;

    const out: PricedLine = {
      ...base,
      inventoryId: inv?.id ?? null,
      sku: variant?.sku ?? product.sku,
      variantLabel: variantLabel(variant ?? null),
      mrp,
      unitPrice,
      lineMrp: mrp * line.quantity,
      lineTotal: unitPrice * line.quantity,
      taxRate,
      availableStock: available,
    };
    if (available <= 0) return { ...out, issue: 'OUT_OF_STOCK', issueMessage: 'Out of stock' };
    if (line.quantity > available) {
      return { ...out, issue: 'INSUFFICIENT_STOCK', issueMessage: `Only ${available} left in stock` };
    }
    return out;
  });

  const items = priced.filter((l) => !l.savedForLater);
  const saved = priced.filter((l) => l.savedForLater);
  const billable = items.filter((l) => l.issue !== 'UNAVAILABLE' && l.issue !== 'OUT_OF_STOCK');

  const mrpTotal = billable.reduce((s, l) => s + l.lineMrp, 0);
  const subtotal = billable.reduce((s, l) => s + l.lineTotal, 0);

  // Coupon
  let couponDiscount = 0;
  let coupon: PricedCart['coupon'] = null;
  let couponError: string | null = null;
  const couponShare = new Array<number>(billable.length).fill(0);
  if (opts.couponCode && billable.length > 0) {
    const check = await evaluateCoupon(db, opts.couponCode, opts.userId ?? null, billable);
    if (check.coupon) {
      coupon = { code: check.coupon.code, description: check.coupon.description };
      couponDiscount = check.discount;
      // Spread the discount across eligible lines in proportion to their value (last line takes the remainder).
      const eligibleTotal = check.eligibleIndexes.reduce((s, i) => s + billable[i]!.lineTotal, 0);
      let allocated = 0;
      check.eligibleIndexes.forEach((idx, n) => {
        const isLast = n === check.eligibleIndexes.length - 1;
        const share = isLast ? couponDiscount - allocated : Math.floor((couponDiscount * billable[idx]!.lineTotal) / eligibleTotal);
        couponShare[idx] = share;
        allocated += share;
      });
    } else {
      couponError = check.error;
    }
  }

  // Tax
  const taxInclusive = settings.tax.pricesIncludeTax;
  let tax = 0;
  billable.forEach((line, i) => {
    const taxable = line.lineTotal - couponShare[i]!;
    const rate = line.taxRate / 100;
    line.taxAmount = taxInclusive ? Math.round(taxable - taxable / (1 + rate)) : Math.round(taxable * rate);
    line.netAmount = taxInclusive ? taxable : taxable + line.taxAmount;
    tax += line.taxAmount;
  });

  // Shipping
  const shipping = await quoteShipping(opts.pincode);
  const afterCoupon = subtotal - couponDiscount;
  const shippingFee = billable.length > 0 ? shippingFeeFor(shipping, afterCoupon) : 0;
  const total = afterCoupon + (taxInclusive ? 0 : tax) + shippingFee;

  return {
    items,
    saved,
    summary: {
      itemCount: billable.reduce((s, l) => s + l.quantity, 0),
      mrpTotal,
      discount: mrpTotal - subtotal,
      subtotal,
      couponCode: coupon?.code ?? null,
      couponDiscount,
      shippingFee,
      freeShippingAbove: shipping.freeAbove,
      tax,
      taxInclusive,
      total,
    },
    coupon,
    couponError,
    hasIssues: items.some((l) => l.issue !== null),
    shipping,
  };
}
