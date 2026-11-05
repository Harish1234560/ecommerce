import type { InventoryTxnType } from '@prisma/client';
import type { Tx } from '../database/prisma.js';
import { conflict } from '../utils/errors.js';

// All stock movements go through here so that every change is atomic, guarded against
// overselling at the SQL level, and recorded in inventory_transactions.

interface Movement {
  inventoryId: string;
  quantity: number;
  orderId?: string;
  adminId?: string;
  note?: string;
}

async function record(tx: Tx, m: Movement, type: InventoryTxnType, quantity: number, reservedDelta: number) {
  const inv = await tx.inventory.findUniqueOrThrow({ where: { id: m.inventoryId }, select: { stock: true, productId: true } });
  await tx.inventoryTransaction.create({
    data: {
      inventoryId: m.inventoryId,
      type,
      quantity,
      reservedDelta,
      stockAfter: inv.stock,
      note: m.note,
      orderId: m.orderId,
      adminId: m.adminId,
    },
  });
  await syncProductStock(tx, inv.productId);
}

// Hold stock for an order that is not confirmed yet. Fails if not enough is available.
export async function reserveStock(tx: Tx, m: Movement) {
  const updated = await tx.$executeRaw`
    UPDATE inventory SET reserved = reserved + ${m.quantity}, "updatedAt" = now()
    WHERE id = ${m.inventoryId} AND stock - reserved >= ${m.quantity}`;
  if (updated === 0) throw conflict('Some items in your cart just went out of stock. Please review your cart.', 'OUT_OF_STOCK');
  await record(tx, m, 'RESERVE', 0, m.quantity);
}

// Give a reservation back (order cancelled or payment expired before confirmation).
export async function releaseStock(tx: Tx, m: Movement) {
  await tx.$executeRaw`
    UPDATE inventory SET reserved = GREATEST(reserved - ${m.quantity}, 0), "updatedAt" = now()
    WHERE id = ${m.inventoryId}`;
  await record(tx, m, 'RELEASE', 0, -m.quantity);
}

// Turn a reservation into a sale (order confirmed).
export async function commitStock(tx: Tx, m: Movement) {
  const updated = await tx.$executeRaw`
    UPDATE inventory
    SET stock = stock - ${m.quantity}, reserved = GREATEST(reserved - ${m.quantity}, 0), "updatedAt" = now()
    WHERE id = ${m.inventoryId} AND stock >= ${m.quantity}`;
  if (updated === 0) throw conflict('Not enough stock to confirm this order', 'OUT_OF_STOCK');
  await record(tx, m, 'SALE', -m.quantity, -m.quantity);
}

// Put sold stock back on the shelf (confirmed order cancelled, or a return received).
export async function restoreStock(tx: Tx, m: Movement, type: 'CANCEL' | 'RETURN') {
  await tx.$executeRaw`
    UPDATE inventory SET stock = stock + ${m.quantity}, "updatedAt" = now() WHERE id = ${m.inventoryId}`;
  await record(tx, m, type, m.quantity, 0);
}

// Manual admin change. `delta` may be negative but can never cut into reserved stock.
export async function adjustStock(tx: Tx, m: Movement & { delta: number; type: 'RESTOCK' | 'ADJUSTMENT' }) {
  const updated = await tx.$executeRaw`
    UPDATE inventory SET stock = stock + ${m.delta}, "updatedAt" = now()
    WHERE id = ${m.inventoryId} AND stock + ${m.delta} >= reserved`;
  if (updated === 0) throw conflict('Stock cannot go below the quantity reserved by open orders');
  await record(tx, m, m.type, m.delta, 0);
}

// Keeps products.stock (total available) in sync with its inventory rows.
export async function syncProductStock(tx: Tx, productId: string) {
  const product = await tx.product.findUnique({ where: { id: productId }, select: { hasVariants: true } });
  if (!product) return;
  const rows = await tx.inventory.findMany({
    where: product.hasVariants ? { productId, variant: { isActive: true } } : { productId, variantId: null },
    select: { stock: true, reserved: true },
  });
  const available = rows.reduce((sum, r) => sum + Math.max(r.stock - r.reserved, 0), 0);
  await tx.product.update({ where: { id: productId }, data: { stock: available } });
}

export async function findInventoryId(tx: Tx, productId: string, variantId: string | null): Promise<string | null> {
  const inv = variantId
    ? await tx.inventory.findUnique({ where: { variantId }, select: { id: true } })
    : await tx.inventory.findFirst({ where: { productId, variantId: null }, select: { id: true } });
  return inv?.id ?? null;
}
