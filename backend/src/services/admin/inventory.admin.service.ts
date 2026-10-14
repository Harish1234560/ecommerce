import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import type { InventoryQuery, StockAdjustInput } from '../../validators/adminCatalog.validators.js';
import { adjustStock } from '../inventory.service.js';

// Inventory screens compare two columns (stock − reserved against the threshold), which needs raw SQL.

// Only rows that are actually sellable: variant rows for variant products, the base row otherwise.
const SELLABLE = Prisma.sql`p."deletedAt" IS NULL AND ((p."hasVariants" AND i."variantId" IS NOT NULL AND v."isActive") OR (NOT p."hasVariants" AND i."variantId" IS NULL))`;
const FROM = Prisma.sql`FROM inventory i JOIN products p ON p.id = i."productId" LEFT JOIN product_variants v ON v.id = i."variantId"`;
const IS_LOW = Prisma.sql`(i.stock - i.reserved) <= i."lowStockThreshold"`;

interface InventoryRow {
  id: string;
  productId: string;
  name: string;
  image: string | null;
  sku: string;
  size: string | null;
  color: string | null;
  stock: number;
  reserved: number;
  lowStockThreshold: number;
  updatedAt: Date;
}

export async function countLowStock(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count ${FROM} WHERE ${SELLABLE} AND ${IS_LOW}`;
  return rows[0]?.count ?? 0;
}

export function listLowStock(limit: number) {
  return prisma.$queryRaw<{ id: string; productId: string; name: string; sku: string; size: string | null; color: string | null; available: number; lowStockThreshold: number }[]>`
    SELECT i.id, p.id AS "productId", p.name, COALESCE(v.sku, p.sku) AS sku, v.size, v.color,
           (i.stock - i.reserved)::int AS available, i."lowStockThreshold"
    ${FROM} WHERE ${SELLABLE} AND ${IS_LOW}
    ORDER BY (i.stock - i.reserved) ASC, p.name ASC LIMIT ${limit}`;
}

export async function listInventory(q: InventoryQuery) {
  const conditions = [SELLABLE];
  if (q.q) {
    const like = `%${q.q}%`;
    conditions.push(Prisma.sql`(p.name ILIKE ${like} OR p.sku ILIKE ${like} OR v.sku ILIKE ${like})`);
  }
  if (q.filter === 'low') conditions.push(Prisma.sql`${IS_LOW} AND (i.stock - i.reserved) > 0`);
  if (q.filter === 'out') conditions.push(Prisma.sql`(i.stock - i.reserved) <= 0`);
  const where = Prisma.join(conditions, ' AND ');

  const [rows, count] = await Promise.all([
    prisma.$queryRaw<InventoryRow[]>`
      SELECT i.id, p.id AS "productId", p.name, COALESCE(v.sku, p.sku) AS sku, v.size, v.color,
             i.stock, i.reserved, i."lowStockThreshold", i."updatedAt",
             (SELECT url FROM product_images pi WHERE pi."productId" = p.id ORDER BY pi."isPrimary" DESC, pi."sortOrder" ASC LIMIT 1) AS image
      ${FROM} WHERE ${where}
      ORDER BY p.name ASC, v.sku ASC NULLS FIRST
      LIMIT ${q.limit} OFFSET ${(q.page - 1) * q.limit}`,
    prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count ${FROM} WHERE ${where}`,
  ]);
  const items = rows.map((r) => {
    const available = Math.max(r.stock - r.reserved, 0);
    return { ...r, variantLabel: [r.size, r.color].filter(Boolean).join(' / ') || null, available, isLow: available <= r.lowStockThreshold, isOut: available <= 0 };
  });
  return { items, total: count[0]?.count ?? 0 };
}

const DEFAULT_NOTE: Record<StockAdjustInput['mode'], string> = { increase: 'Stock added', decrease: 'Stock removed', set: 'Stock count corrected' };

export async function adjustInventory(inventoryId: string, input: StockAdjustInput, adminId: string) {
  const inv = await prisma.inventory.findUnique({ where: { id: inventoryId }, include: { product: { select: { name: true } } } });
  if (!inv) throw notFound('Inventory item');
  const delta = input.mode === 'increase' ? input.quantity : input.mode === 'decrease' ? -input.quantity : input.quantity - inv.stock;
  if (delta === 0) throw badRequest(input.mode === 'set' ? 'Stock is already at that level' : 'Enter a quantity greater than zero');
  if (inv.stock + delta < 0) throw badRequest('Stock cannot go below zero');

  await prisma.$transaction((tx) =>
    adjustStock(tx, {
      inventoryId: inv.id,
      quantity: Math.abs(delta),
      delta,
      type: input.mode === 'increase' ? 'RESTOCK' : 'ADJUSTMENT',
      adminId,
      note: input.note || DEFAULT_NOTE[input.mode],
    }),
  );
  const updated = await prisma.inventory.findUniqueOrThrow({ where: { id: inv.id } });
  return { id: updated.id, productName: inv.product.name, delta, stock: updated.stock, reserved: updated.reserved, available: Math.max(updated.stock - updated.reserved, 0) };
}

export async function setLowStockThreshold(inventoryId: string, lowStockThreshold: number): Promise<void> {
  const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } });
  if (!inv) throw notFound('Inventory item');
  await prisma.inventory.update({ where: { id: inv.id }, data: { lowStockThreshold } });
}

export async function getStockHistory(inventoryId: string) {
  const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } });
  if (!inv) throw notFound('Inventory item');
  const rows = await prisma.inventoryTransaction.findMany({ where: { inventoryId: inv.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  const adminIds = [...new Set(rows.map((r) => r.adminId).filter((v): v is string => !!v))];
  const admins = adminIds.length ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } }) : [];
  const nameBy = new Map(admins.map((a) => [a.id, a.name]));
  return rows.map((r) => ({ ...r, adminName: r.adminId ? (nameBy.get(r.adminId) ?? null) : null }));
}
