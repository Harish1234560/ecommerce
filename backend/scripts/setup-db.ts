// `npm run setup` — applies migrations and seeds demo data.
// Starts the bundled PostgreSQL for the duration if nothing is listening on the database port.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isListening, startDatabase } from './db.js';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const run = (command: string) => {
  const result = spawnSync(command, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) throw new Error(`"${command}" failed`);
};

const stopDatabase = (await isListening()) ? null : await startDatabase();
let failed = false;
try {
  run('npx prisma migrate deploy');
  run('npx prisma generate');
  run('npx tsx prisma/seed.ts');
} catch (err) {
  failed = true;
  console.error(String(err));
} finally {
  await stopDatabase?.();
}
process.exit(failed ? 1 : 0);
