// Bundled development PostgreSQL (no system install or Docker needed). Data lives in backend/.pgdata.
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const dataDir = fileURLToPath(new URL('../.pgdata', import.meta.url));
const url = new URL(process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/shophub');
export const dbPort = Number(process.env.EMBEDDED_DB_PORT ?? url.port ?? 5433);
export const dbName = url.pathname.replace(/^\//, '') || 'shophub';

export function isListening(port = dbPort): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

// Starts the server (initialising the data directory and database on first run) and returns a stop function.
export async function startDatabase(): Promise<() => Promise<void>> {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: decodeURIComponent(url.username) || 'postgres',
    password: decodeURIComponent(url.password) || 'postgres',
    port: dbPort,
    persistent: true,
    // UTF-8 regardless of the OS locale (Windows defaults to WIN1252, which cannot store ₹).
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => {},
    onError: (e) => console.error(String(e)),
  });

  if (!existsSync(`${dataDir}/PG_VERSION`)) await pg.initialise();
  await pg.start();

  const client = pg.getPgClient();
  await client.connect();
  const existing = await client.query('SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = $1', [dbName]);
  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}" ENCODING 'UTF8' TEMPLATE template0`);
  } else if (existing.rows[0].encoding !== 'UTF8') {
    console.warn(`WARNING: database "${dbName}" uses ${existing.rows[0].encoding} encoding; recreate it as UTF8.`);
  }
  await client.end();

  return async () => {
    // Prefer a graceful `pg_ctl stop`: killing only the main process (what the wrapper does) can
    // leave worker processes holding the port on Windows.
    const pgCtl = await findPgCtl();
    const stopped = pgCtl ? spawnSync(pgCtl, ['stop', '-D', dataDir, '-m', 'fast', '-w'], { stdio: 'ignore' }).status === 0 : false;
    if (!stopped) await pg.stop();
  };
}

// Locates pg_ctl through the platform package that ships the bundled PostgreSQL binaries.
async function findPgCtl(): Promise<string | null> {
  const os = { win32: 'windows', darwin: 'darwin', linux: 'linux' }[process.platform as string];
  if (!os) return null;
  try {
    const binaries = (await import(`@embedded-postgres/${os}-${process.arch}`)) as { pg_ctl?: string };
    return binaries.pg_ctl && existsSync(binaries.pg_ctl) ? binaries.pg_ctl : null;
  } catch {
    return null;
  }
}
