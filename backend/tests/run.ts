// `npm test` — runs the API test suite end to end with no manual setup (see stack.ts).
import { startTestStack } from './stack.js';

let failures = 1;
let stop: (() => Promise<void>) | null = null;
try {
  stop = await startTestStack();
  const { runApiTests } = await import('./api.e2e.js');
  failures = await runApiTests();
} catch (err) {
  console.error(err);
} finally {
  await stop?.();
}
process.exit(failures === 0 ? 0 : 1);
