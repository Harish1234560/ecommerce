import { prisma } from '../database/prisma.js';
import { conflict, notFound } from '../utils/errors.js';
import { addItem } from './cart.service.js';
import { cardSelect, toCard, visibleProduct } from './catalog.service.js';

async function wishlistFor(userId: string) {
  return prisma.wishlist.upsert({ where: { userId }, create: { userId }, update: {} });
}

export async function listWishlist(userId: string) {
  const wishlist = await wishlistFor(userId);
  const items = await prisma.wishlistItem.findMany({
    where: { wishlistId: wishlist.id },
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { ...cardSelect, status: true, deletedAt: true } } },
  });
  return items.map((i) => {
    const { status, deletedAt, ...card } = i.product;
    return { id: i.id, addedAt: i.createdAt, available: status === 'ACTIVE' && !deletedAt, product: toCard(card) };
  });
}

export async function listWishlistProductIds(userId: string): Promise<string[]> {
  const items = await prisma.wishlistItem.findMany({ where: { wishlist: { userId } }, select: { productId: true } });
  return items.map((i) => i.productId);
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  const product = await prisma.product.findFirst({ where: { AND: [visibleProduct, { id: productId }] }, select: { id: true } });
  if (!product) throw notFound('Product');
  const wishlist = await wishlistFor(userId);
  await prisma.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    create: { wishlistId: wishlist.id, productId },
    update: {},
  });
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await prisma.wishlistItem.deleteMany({ where: { productId, wishlist: { userId } } });
}

export async function moveToCart(userId: string, productId: string): Promise<void> {
  const item = await prisma.wishlistItem.findFirst({ where: { productId, wishlist: { userId } }, include: { product: { select: { hasVariants: true } } } });
  if (!item) throw notFound('Wishlist item');
  if (item.product.hasVariants) throw conflict('Please choose a size / color on the product page', 'VARIANT_REQUIRED');
  await addItem(userId, { productId, quantity: 1 }); // validates availability and stock
  await prisma.wishlistItem.delete({ where: { id: item.id } });
}
