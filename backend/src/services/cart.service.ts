import { MAX_QTY_PER_ITEM } from '../constants/index.js';
import { prisma } from '../database/prisma.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import type { CartLineInput, QuoteInput, UpdateCartItemInput } from '../validators/cart.validators.js';
import { evaluateCoupon, priceCart, type PricedCart } from './pricing.service.js';

// The signed-in customer's cart. Every read returns the cart priced from the database.

type Pincode = string | null | undefined;

async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({ where: { userId }, create: { userId }, update: {}, include: { items: { orderBy: { createdAt: 'asc' } } } });
}

export async function getCart(userId: string, pincode?: Pincode): Promise<PricedCart> {
  const cart = await getOrCreateCart(userId);
  return priceCart(
    cart.items.map((i) => ({ id: i.id, productId: i.productId, variantId: i.variantId, quantity: i.quantity, savedForLater: i.savedForLater })),
    { couponCode: cart.couponCode, userId, pincode },
  );
}

// Prices a guest's browser cart. Lines get a synthetic id so the client can address them.
export async function quoteCart(input: QuoteInput): Promise<PricedCart> {
  return priceCart(
    input.items.map((i) => ({ id: `${i.productId}:${i.variantId ?? ''}`, productId: i.productId, variantId: i.variantId ?? null, quantity: i.quantity })),
    { couponCode: input.couponCode, pincode: input.pincode },
  );
}

// Product exists → is active → has stock for the requested quantity.
async function assertPurchasable(productId: string, variantId: string | null, quantity: number) {
  const [line] = (await priceCart([{ productId, variantId, quantity }])).items;
  if (!line || line.issue === 'UNAVAILABLE') {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { hasVariants: true, deletedAt: true, status: true } });
    if (product && !product.deletedAt && product.status === 'ACTIVE' && product.hasVariants && !variantId) {
      throw conflict('Please choose an option (size / color) for this product', 'VARIANT_REQUIRED');
    }
    throw conflict(line?.issueMessage ?? 'This product is not available', 'UNAVAILABLE');
  }
  if (line.issue === 'OUT_OF_STOCK') throw conflict('This product is out of stock', 'OUT_OF_STOCK');
  if (line.issue === 'INSUFFICIENT_STOCK') throw conflict(line.issueMessage ?? 'Not enough stock', 'INSUFFICIENT_STOCK');
}

// Adds to an existing line when the same product/variant is already in the cart.
export async function addItem(userId: string, input: CartLineInput): Promise<void> {
  const variantId = input.variantId ?? null;
  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((i) => i.productId === input.productId && i.variantId === variantId);
  const quantity = Math.min((existing && !existing.savedForLater ? existing.quantity : 0) + input.quantity, MAX_QTY_PER_ITEM);
  await assertPurchasable(input.productId, variantId, quantity);
  if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity, savedForLater: false } });
  else await prisma.cartItem.create({ data: { cartId: cart.id, productId: input.productId, variantId, quantity } });
}

export async function updateItem(userId: string, itemId: string, input: UpdateCartItemInput): Promise<void> {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cart: { userId } } });
  if (!item) throw notFound('Cart item');
  const quantity = input.quantity ?? item.quantity;
  const savedForLater = input.savedForLater ?? item.savedForLater;
  if (!savedForLater) await assertPurchasable(item.productId, item.variantId, quantity);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity, savedForLater } });
}

export async function removeItem(userId: string, itemId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { id: itemId, cart: { userId } } });
}

export async function clearCart(userId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cart: { userId }, savedForLater: false } });
  await prisma.cart.updateMany({ where: { userId }, data: { couponCode: null } });
}

export async function applyCoupon(userId: string, code: string): Promise<void> {
  const current = await getCart(userId);
  const billable = current.items.filter((l) => l.issue !== 'UNAVAILABLE' && l.issue !== 'OUT_OF_STOCK');
  if (billable.length === 0) throw badRequest('Add items to your cart before applying a coupon');
  const check = await evaluateCoupon(prisma, code, userId, billable);
  if (!check.coupon) throw badRequest(check.error ?? 'This coupon code is not valid');
  await prisma.cart.update({ where: { userId }, data: { couponCode: check.coupon.code } });
}

export async function removeCoupon(userId: string): Promise<void> {
  await prisma.cart.updateMany({ where: { userId }, data: { couponCode: null } });
}

// Folds a guest's browser cart into the account cart after sign-in. Lines that cannot be bought are skipped.
export async function mergeGuestCart(userId: string, lines: CartLineInput[]): Promise<void> {
  const cart = await getOrCreateCart(userId);
  for (const line of lines) {
    const variantId = line.variantId ?? null;
    const existing = cart.items.find((i) => i.productId === line.productId && i.variantId === variantId);
    const [priced] = (await priceCart([{ productId: line.productId, variantId, quantity: 1 }])).items;
    if (!priced || priced.issue) continue;
    const quantity = Math.min((existing && !existing.savedForLater ? existing.quantity : 0) + line.quantity, priced.availableStock, MAX_QTY_PER_ITEM);
    if (quantity < 1) continue;
    if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity, savedForLater: false } });
    else await prisma.cartItem.create({ data: { cartId: cart.id, productId: line.productId, variantId, quantity } });
  }
}
