import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectWithRetry, prisma } from './database/prisma.js';
import { startJobs } from './services/jobs.service.js';
import { logger } from './utils/logger.js';

await connectWithRetry();

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info(`API ready on http://localhost:${env.PORT}  (payments: ${env.PAYMENT_GATEWAY}, storage: ${env.STORAGE_PROVIDER})`);
});
const stopJobs = startJobs();

async function shutdown() {
  stopJobs();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
