// Test stack shared by the API tests and the browser tests:
//   1. starts the bundled PostgreSQL if nothing is listening on the database port
//   2. prepares an isolated test database (<name>_test): create → migrate → seed
//   3. starts the API in-process on a separate port, with the test payment gateway
// The development database is never touched.
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { isListening, startDatabase } from '../scripts/db.js';

export const TEST_PORT = 4100;
export const TEST_BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const backendDir = fileURLToPath(new URL('..', import.meta.url));

function run(command: string) {
  const result = spawnSync(command, { cwd: backendDir, stdio: ['ignore', 'ignore', 'inherit'], shell: true, env: process.env });
  if (result.status !== 0) throw new Error(`"${command}" failed`);
}

/** Starts the stack and returns a function that shuts it down again. */
export async function startTestStack(): Promise<() => Promise<void>> {
  const devUrl = new URL(process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/shophub');
  const testDb = `${devUrl.pathname.replace(/^\//, '') || 'shophub'}_test`;
  const testUrl = new URL(devUrl);
  testUrl.pathname = `/${testDb}`;
  const adminUrl = new URL(devUrl);
  adminUrl.pathname = '/postgres';

  // Everything imported from src/ below reads these.
  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: String(TEST_PORT),
    CLIENT_URL: TEST_BASE_URL,
    DATABASE_URL: testUrl.toString(),
    JWT_SECRET: process.env.JWT_SECRET || 'test-only-secret-never-used-outside-the-test-suite',
    PAYMENT_GATEWAY: 'mock',
    STORAGE_PROVIDER: 'local',
    UPLOAD_DIR: fileURLToPath(new URL('../.tmp/test-uploads', import.meta.url)),
    SMTP_HOST: '',
  });

  const stopDatabase = (await isListening()) ? null : await startDatabase();
  let closeServer: (() => Promise<void>) | null = null;
  const stop = async () => {
    await closeServer?.();
    await stopDatabase?.();
  };

  try {
    const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
    const exists = await admin.$queryRaw<unknown[]>`SELECT 1 FROM pg_database WHERE datname = ${testDb}`;
    if (exists.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${testDb.replace(/"/g, '')}" ENCODING 'UTF8' TEMPLATE template0`);
    await admin.$disconnect();

    console.log(`Preparing test database "${testDb}"…`);
    run('npx prisma migrate deploy');
    run('npx tsx prisma/seed.ts'); // skipped when the database already has data

    const { createApp } = await import('../src/app.js');
    const { prisma } = await import('../src/database/prisma.js');
    const server = createApp().listen(TEST_PORT);
    await new Promise<void>((resolve, reject) => server.once('listening', resolve).once('error', reject));
    closeServer = async () => {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await prisma.$disconnect();
    };
  } catch (err) {
    await stop();
    throw err;
  }
  return stop;
}
