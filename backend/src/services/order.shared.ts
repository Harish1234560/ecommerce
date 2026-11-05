import type { OrderStatus } from '@prisma/client';
import type { Actor } from '../constants/index.js';
import type { Tx } from '../database/prisma.js';
import { notFound } from '../utils/errors.js';
import { commitStock, findInventoryId } from './inventory.service.js';

// Building blocks shared by the order, payment and refund services. Each expects to run inside a transaction.

// Row lock so concurrent mutations of one order (webhook vs. verify vs. expiry vs. admin) serialise.
export async function lockOrder(tx: Tx, orderId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
  if (rows.length === 0) throw notFound('Order');
}

export async function addHistory(tx: Tx, orderId: string, status: OrderStatus, note: string | null, actor: Actor) {
  await tx.orderStatusHistory.create({ data: { orderId, status, note, actor } });
}

// Converts the order's reservations into sales. Caller must hold the order lock.
export async function confirmOrderInTx(tx: Tx, orderId: string, note: string, actor: Actor) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (!order.stockCommitted) {
    for (const item of order.items) {
      const inventoryId = await findInventoryId(tx, item.productId, item.variantId);
      if (inventoryId) {
        await commitStock(tx, { inventoryId, quantity: item.quantity, orderId, note: `Order ${order.orderNumber}` });
      }
      await tx.product.update({ where: { id: item.productId }, data: { salesCount: { increment: item.quantity } } });
    }
  }
  await tx.order.update({
    where: { id: orderId },
    data: { status: 'CONFIRMED', stockCommitted: true, confirmedAt: new Date(), invoiceNumber: order.invoiceNumber ?? `INV-${order.orderNumber}` },
  });
  await addHistory(tx, orderId, 'CONFIRMED', note, actor);
}
