import { PrismaClient, type Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient();

// Transaction client type shared by services that can run inside or outside a transaction.
export type Tx = Prisma.TransactionClient;

export async function connectWithRetry(attempts = 30, delayMs = 1000): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (err) {
      if (i === attempts) throw err;
      if (i === 1) logger.info('Waiting for the database…');
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
