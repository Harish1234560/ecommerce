import type { Prisma } from '@prisma/client';
import { LOW_STOCK_LIST_THRESHOLD } from '../../constants/index.js';
import { prisma, type Tx } from '../../database/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { uniqueSlug } from '../../utils/slug.js';
import type { AdminProductsQuery, BulkProductAction, ProductInput, ProductPatch } from '../../validators/adminCatalog.validators.js';
import { adjustStock, syncProductStock } from '../inventory.service.js';

// Product management. Stock changes made here go through the inventory service so they are recorded.

const SORT: Record<AdminProductsQuery['sort'], Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  name: { name: 'asc' },
  price_asc: { sellingPrice: 'asc' },
  price_desc: { sellingPrice: 'desc' },
  stock_asc: { stock: 'asc' },
  stock_desc: { stock: 'desc' },
  sales: { salesCount: 'desc' },
};

export async function listProducts(q: AdminProductsQuery) {
  const and: Prisma.ProductWhereInput[] = [{ deletedAt: null }];
  if (q.q) and.push({ OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { sku: { contains: q.q, mode: 'insensitive' } }, { brand: { contains: q.q, mode: 'insensitive' } }] });
  if (q.category) and.push({ categoryId: q.category });
  if (q.status) and.push({ status: q.status });
  if (q.stock === 'out') and.push({ stock: { lte: 0 } });
  if (q.stock === 'in') and.push({ stock: { gt: 0 } });
  if (q.stock === 'low') and.push({ stock: { gt: 0, lte: LOW_STOCK_LIST_THRESHOLD } });
  if (q.flag === 'featured') and.push({ featured: true });
  if (q.flag === 'trending') and.push({ isTrending: true });
  if (q.flag === 'bestseller') and.push({ isBestSeller: true });
  const where = { AND: and };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: SORT[q.sort],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      select: {
        id: true, name: true, slug: true, sku: true, brand: true, price: true, sellingPrice: true, discountPercent: true, stock: true, status: true,
        featured: true, isTrending: true, isBestSeller: true, hasVariants: true, salesCount: true, createdAt: true,
        category: { select: { id: true, name: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);
  return { items: rows.map(({ images, ...p }) => ({ ...p, image: images[0]?.url ?? null })), total };
}

// Full product for the edit form.
export async function getProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      variants: { include: { inventory: true }, orderBy: { createdAt: 'asc' } },
      inventory: { where: { variantId: null } },
    },
  });
  if (!product) throw notFound('Product');
  const { inventory, variants, ...rest } = product;
  const base = inventory[0];
  return {
    ...rest,
    baseStock: base?.stock ?? 0,
    reserved: base?.reserved ?? 0,
    lowStockThreshold: base?.lowStockThreshold ?? variants[0]?.inventory?.lowStockThreshold ?? 5,
    variants: variants.map((v) => ({
      id: v.id, sku: v.sku, size: v.size, color: v.color, price: v.price, discountPrice: v.discountPrice, isActive: v.isActive,
      stock: v.inventory?.stock ?? 0, reserved: v.inventory?.reserved ?? 0,
    })),
  };
}

function productSlug(base: string, excludeId?: string) {
  return uniqueSlug(base, 'product', async (slug) => !!(await prisma.product.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })));
}

function coreData(input: ProductInput, slug: string) {
  const sellingPrice = input.discountPrice ?? input.price;
  return {
    name: input.name,
    slug,
    sku: input.sku,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    description: input.description,
    specifications: input.specifications,
    brand: input.brand,
    tags: [...new Set(input.tags)],
    price: input.price,
    discountPrice: input.discountPrice ?? null,
    sellingPrice,
    discountPercent: Math.round(((input.price - sellingPrice) / input.price) * 100),
    tax: input.tax ?? null,
    weight: input.weight ?? null,
    length: input.length ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    status: input.status,
    featured: input.featured,
    isTrending: input.isTrending,
    isBestSeller: input.isBestSeller,
    hasVariants: input.variants.length > 0,
  };
}

async function assertCategory(input: ProductInput) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId }, include: { subcategories: { select: { id: true } } } });
  if (!category) throw badRequest('Select a valid category', { categoryId: 'Select a valid category' });
  if (input.subcategoryId && !category.subcategories.some((s) => s.id === input.subcategoryId)) {
    throw badRequest('The subcategory does not belong to the selected category', { subcategoryId: 'Invalid subcategory' });
  }
}

// The first image is the primary image; order is the order given.
async function writeImages(tx: Tx, productId: string, images: ProductInput['images']) {
  await tx.productImage.deleteMany({ where: { productId } });
  if (images.length) {
    await tx.productImage.createMany({ data: images.map((img, i) => ({ productId, url: img.url, alt: img.alt, sortOrder: i, isPrimary: i === 0 })) });
  }
}

async function createInventory(tx: Tx, productId: string, variantId: string | null, stock: number, threshold: number, adminId: string) {
  const inv = await tx.inventory.create({ data: { productId, variantId, stock, lowStockThreshold: threshold } });
  if (stock > 0) {
    await tx.inventoryTransaction.create({ data: { inventoryId: inv.id, type: 'RESTOCK', quantity: stock, stockAfter: stock, note: 'Opening stock', adminId } });
  }
}

// Sets an inventory row to an absolute stock level, recording the difference as a transaction.
async function setStock(tx: Tx, inventoryId: string, target: number, threshold: number, adminId: string) {
  const inv = await tx.inventory.findUniqueOrThrow({ where: { id: inventoryId } });
  if (inv.lowStockThreshold !== threshold) await tx.inventory.update({ where: { id: inventoryId }, data: { lowStockThreshold: threshold } });
  const delta = target - inv.stock;
  if (delta !== 0) {
    await adjustStock(tx, { inventoryId, quantity: Math.abs(delta), delta, type: 'ADJUSTMENT', adminId, note: 'Edited from the product form' });
  }
}

const variantData = (v: ProductInput['variants'][number]) => ({
  sku: v.sku, size: v.size, color: v.color, price: v.price ?? null, discountPrice: v.discountPrice ?? null, isActive: v.isActive,
});

export async function createProduct(input: ProductInput, adminId: string) {
  await assertCategory(input);
  const slug = await productSlug(input.slug || input.name);
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data: coreData(input, slug) });
    await writeImages(tx, product.id, input.images);
    // The base inventory row always exists so a product can switch between simple and variant modes.
    await createInventory(tx, product.id, null, input.variants.length ? 0 : input.stock, input.lowStockThreshold, adminId);
    for (const v of input.variants) {
      const variant = await tx.productVariant.create({ data: { ...variantData(v), productId: product.id } });
      await createInventory(tx, product.id, variant.id, v.stock, input.lowStockThreshold, adminId);
    }
    await syncProductStock(tx, product.id);
    return product;
  }, { timeout: 20_000 });
}

// Returns the commercially significant changes so the caller can record them in the audit log.
export async function updateProduct(id: string, input: ProductInput, adminId: string) {
  const existing = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: { variants: { include: { inventory: true, _count: { select: { orderItems: true } } } }, inventory: { where: { variantId: null } } },
  });
  if (!existing) throw notFound('Product');
  await assertCategory(input);
  const slug = input.slug && input.slug !== existing.slug ? await productSlug(input.slug, existing.id) : existing.slug;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id: existing.id }, data: coreData(input, slug) });
    await writeImages(tx, existing.id, input.images);

    // Variants: retire the removed ones, update the ones that still exist, create the new ones.
    const keptIds = new Set(input.variants.map((v) => v.id).filter(Boolean));
    for (const old of existing.variants) {
      if (keptIds.has(old.id)) continue;
      // A variant that appears on past orders is deactivated instead of deleted.
      if (old._count.orderItems > 0) await tx.productVariant.update({ where: { id: old.id }, data: { isActive: false } });
      else await tx.productVariant.delete({ where: { id: old.id } });
    }
    for (const v of input.variants) {
      const old = v.id ? existing.variants.find((x) => x.id === v.id) : undefined;
      if (old) {
        await tx.productVariant.update({ where: { id: old.id }, data: variantData(v) });
        if (old.inventory) await setStock(tx, old.inventory.id, v.stock, input.lowStockThreshold, adminId);
        else await createInventory(tx, existing.id, old.id, v.stock, input.lowStockThreshold, adminId);
      } else {
        const created = await tx.productVariant.create({ data: { ...variantData(v), productId: existing.id } });
        await createInventory(tx, existing.id, created.id, v.stock, input.lowStockThreshold, adminId);
      }
    }

    const base = existing.inventory[0];
    if (!base) await createInventory(tx, existing.id, null, input.variants.length ? 0 : input.stock, input.lowStockThreshold, adminId);
    else if (input.variants.length === 0) await setStock(tx, base.id, input.stock, input.lowStockThreshold, adminId);
    await syncProductStock(tx, existing.id);
  }, { timeout: 30_000 });

  const changes: Record<string, unknown> = {};
  if (existing.price !== input.price) changes.price = { from: existing.price, to: input.price };
  if ((existing.discountPrice ?? null) !== (input.discountPrice ?? null)) changes.discountPrice = { from: existing.discountPrice, to: input.discountPrice ?? null };
  if (existing.status !== input.status) changes.status = { from: existing.status, to: input.status };
  if (existing.name !== input.name) changes.name = { from: existing.name, to: input.name };
  return { id: existing.id, slug, changes };
}

// Soft delete: order history keeps pointing at the row, while its slug and SKU are freed for reuse.
async function softDelete(tx: Tx, id: string): Promise<boolean> {
  const product = await tx.product.findFirst({ where: { id, deletedAt: null } });
  if (!product) return false;
  const suffix = `-deleted-${Date.now().toString(36)}`;
  await tx.product.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'INACTIVE', slug: `${product.slug}${suffix}`.slice(0, 190), sku: `${product.sku}${suffix}`, featured: false, isTrending: false, isBestSeller: false },
  });
  await tx.cartItem.deleteMany({ where: { productId: id } });
  await tx.wishlistItem.deleteMany({ where: { productId: id } });
  return true;
}

export async function deleteProduct(id: string): Promise<void> {
  const deleted = await prisma.$transaction((tx) => softDelete(tx, id));
  if (!deleted) throw notFound('Product');
}

export async function patchProduct(id: string, patch: ProductPatch) {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Product');
  const product = await prisma.product.update({ where: { id: existing.id }, data: patch });
  return { id: product.id, name: product.name, status: product.status, featured: product.featured, isTrending: product.isTrending, isBestSeller: product.isBestSeller };
}

const BULK_UPDATE: Record<Exclude<BulkProductAction, 'delete'>, Prisma.ProductUpdateManyMutationInput> = {
  activate: { status: 'ACTIVE' },
  deactivate: { status: 'INACTIVE' },
  feature: { featured: true },
  unfeature: { featured: false },
};

export async function bulkUpdateProducts(ids: string[], action: BulkProductAction): Promise<number> {
  if (action !== 'delete') {
    return (await prisma.product.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: BULK_UPDATE[action] })).count;
  }
  let affected = 0;
  await prisma.$transaction(async (tx) => {
    for (const id of ids) if (await softDelete(tx, id)) affected++;
  }, { timeout: 30_000 });
  return affected;
}
