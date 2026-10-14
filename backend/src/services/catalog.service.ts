import { type Prisma } from '@prisma/client';
import { prisma, type Tx } from '../database/prisma.js';
import { notFound } from '../utils/errors.js';
import type { ProductQuery, ProductReviewsQuery } from '../validators/catalog.validators.js';
import { getSettings } from './settings.service.js';

// Public catalogue: visibility rules, the product-card shape, listing filters, product details and categories.

export const visibleProduct: Prisma.ProductWhereInput = {
  status: 'ACTIVE',
  deletedAt: null,
  category: { isActive: true },
};

const primaryImageFirst = [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] satisfies Prisma.ProductImageOrderByWithRelationInput[];

export const cardSelect = {
  id: true,
  name: true,
  slug: true,
  brand: true,
  price: true,
  sellingPrice: true,
  discountPercent: true,
  ratingAvg: true,
  ratingCount: true,
  stock: true,
  hasVariants: true,
  featured: true,
  isTrending: true,
  isBestSeller: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: primaryImageFirst, take: 2, select: { url: true, alt: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export function toCard(p: CardRow) {
  const { images, ...rest } = p;
  return { ...rest, image: images[0]?.url ?? null, hoverImage: images[1]?.url ?? null };
}

// Filters that define the result set's scope (search text, category, flags) — also used for facets.
function scopeWhere(q: ProductQuery): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [visibleProduct];
  if (q.q) {
    for (const word of q.q.split(/\s+/).filter(Boolean).slice(0, 6)) {
      and.push({
        OR: [
          { name: { contains: word, mode: 'insensitive' } },
          { description: { contains: word, mode: 'insensitive' } },
          { brand: { contains: word, mode: 'insensitive' } },
          { tags: { has: word.toLowerCase() } },
          { category: { name: { contains: word, mode: 'insensitive' } } },
          { subcategory: { name: { contains: word, mode: 'insensitive' } } },
        ],
      });
    }
  }
  if (q.category) and.push({ category: { slug: q.category } });
  if (q.subcategory) and.push({ subcategory: { slug: q.subcategory } });
  if (q.featured) and.push({ featured: true });
  if (q.trending) and.push({ isTrending: true });
  if (q.bestseller) and.push({ isBestSeller: true });
  return { AND: and };
}

function filterWhere(q: ProductQuery): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [scopeWhere(q)];
  const brands = q.brand?.split(',').map((b) => b.trim()).filter(Boolean);
  if (brands?.length) and.push({ brand: { in: brands } });
  if (q.minPrice !== undefined) and.push({ sellingPrice: { gte: Math.round(q.minPrice * 100) } });
  if (q.maxPrice !== undefined) and.push({ sellingPrice: { lte: Math.round(q.maxPrice * 100) } });
  if (q.rating) and.push({ ratingAvg: { gte: q.rating } });
  if (q.discount) and.push({ discountPercent: { gte: q.discount } });
  if (q.inStock) and.push({ stock: { gt: 0 } });
  return { AND: and };
}

const ORDER_BY: Record<ProductQuery['sort'], Prisma.ProductOrderByWithRelationInput[]> = {
  popularity: [{ salesCount: 'desc' }, { ratingCount: 'desc' }, { createdAt: 'desc' }],
  newest: [{ createdAt: 'desc' }],
  price_asc: [{ sellingPrice: 'asc' }],
  price_desc: [{ sellingPrice: 'desc' }],
  rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
  discount: [{ discountPercent: 'desc' }],
};

export async function listProducts(q: ProductQuery) {
  const where = filterWhere(q);
  const scope = scopeWhere(q);
  const [rows, total, brands, range] = await Promise.all([
    prisma.product.findMany({ where, select: cardSelect, orderBy: ORDER_BY[q.sort], skip: (q.page - 1) * q.limit, take: q.limit }),
    prisma.product.count({ where }),
    prisma.product.groupBy({ by: ['brand'], where: { AND: [scope, { brand: { not: null } }] }, _count: { _all: true }, orderBy: { brand: 'asc' } }),
    prisma.product.aggregate({ where: scope, _min: { sellingPrice: true }, _max: { sellingPrice: true } }),
  ]);
  return {
    items: rows.map(toCard),
    total,
    facets: {
      brands: brands.map((b) => ({ name: b.brand as string, count: b._count._all })),
      priceRange: { min: range._min.sellingPrice ?? 0, max: range._max.sellingPrice ?? 0 },
    },
  };
}

// Lightweight suggestions for the header search box.
export async function suggestProducts(q: string) {
  const rows = await prisma.product.findMany({
    where: { AND: [visibleProduct, { OR: [{ name: { contains: q, mode: 'insensitive' } }, { brand: { contains: q, mode: 'insensitive' } }] }] },
    select: cardSelect,
    orderBy: { salesCount: 'desc' },
    take: 6,
  });
  return rows.map(toCard);
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { AND: [visibleProduct, { slug }] },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      subcategory: { select: { id: true, name: true, slug: true } },
      images: { orderBy: primaryImageFirst, select: { id: true, url: true, alt: true } },
      variants: { where: { isActive: true }, include: { inventory: true }, orderBy: { createdAt: 'asc' } },
      inventory: { where: { variantId: null } },
    },
  });
  if (!product) throw notFound('Product');

  const [ratingGroups, related, boughtTogether, settings] = await Promise.all([
    prisma.review.groupBy({ by: ['rating'], where: { productId: product.id, status: 'APPROVED' }, _count: { _all: true } }),
    prisma.product.findMany({
      where: { AND: [visibleProduct, { categoryId: product.categoryId, id: { not: product.id } }] },
      select: cardSelect,
      orderBy: { salesCount: 'desc' },
      take: 10,
    }),
    // Products that appear in the same orders as this one.
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { items: { some: { productId: product.id } } }, productId: { not: product.id } },
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 4,
    }),
    getSettings(),
  ]);
  const frequentlyBought = boughtTogether.length
    ? await prisma.product.findMany({ where: { AND: [visibleProduct, { id: { in: boughtTogether.map((c) => c.productId) } }] }, select: cardSelect })
    : [];

  const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of ratingGroups) ratingBreakdown[g.rating] = g._count._all;

  const available = (inv: { stock: number; reserved: number } | null | undefined) => (inv ? Math.max(inv.stock - inv.reserved, 0) : 0);
  const { inventory, variants, deletedAt: _deletedAt, ...rest } = product;
  return {
    ...rest,
    available: product.hasVariants ? product.stock : available(inventory[0]),
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      price: v.price ?? product.price,
      sellingPrice: Math.min(v.price != null ? (v.discountPrice ?? v.price) : product.sellingPrice, v.price ?? product.price),
      available: available(v.inventory),
    })),
    ratingBreakdown,
    related: related.map(toCard),
    frequentlyBought: frequentlyBought.map(toCard),
    returnWindowDays: settings.policies.returnWindowDays,
  };
}

export async function listProductReviews(slug: string, q: ProductReviewsQuery) {
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) throw notFound('Product');
  const where = { productId: product.id, status: 'APPROVED' as const, ...(q.rating ? { rating: q.rating } : {}) };
  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      select: {
        id: true, rating: true, title: true, comment: true, isVerified: true, createdAt: true,
        user: { select: { name: true, avatarUrl: true } },
        images: { select: { id: true, url: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);
  return { items: rows, total };
}

export async function listCategories() {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { subcategories: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, slug: true } } },
    }),
    prisma.product.groupBy({ by: ['categoryId'], where: visibleProduct, _count: { _all: true } }),
  ]);
  const countBy = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    bannerUrl: c.bannerUrl,
    productCount: countBy.get(c.id) ?? 0,
    subcategories: c.subcategories,
  }));
}

export async function getCategoryBySlug(slug: string) {
  const category = (await listCategories()).find((c) => c.slug === slug);
  if (!category) throw notFound('Category');
  return category;
}

// Recomputes a product's rating summary from its approved reviews.
export async function recalcRating(db: Tx, productId: string) {
  const agg = await db.review.aggregate({ where: { productId, status: 'APPROVED' }, _avg: { rating: true }, _count: { _all: true } });
  await db.product.update({
    where: { id: productId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count._all },
  });
}
