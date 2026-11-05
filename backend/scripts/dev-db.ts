// `npm run db:start` — runs the bundled PostgreSQL until stopped.
// Skip this if DATABASE_URL points at your own PostgreSQL.
import { dbName, dbPort, isListening, startDatabase } from './db.js';

// If something already listens on the port (a previous run, or your own PostgreSQL), use it and
// just idle — exiting here would make `npm run dev` shut the other processes down.
const alreadyRunning = await isListening();
const stopDatabase = alreadyRunning ? async () => {} : await startDatabase();
console.log(alreadyRunning ? `Using the database already listening on port ${dbPort}` : `PostgreSQL ready on localhost:${dbPort} (database "${dbName}")`);

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  await stopDatabase().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('SIGBREAK', stop);
setInterval(() => {}, 1 << 30); // keep the process alive
