// Runs one command against the test stack, then shuts the stack down.
// Used by the browser tests: `tsx tests/with-stack.ts node ../frontend/tests/e2e/journey.mjs`
// The command receives E2E_BASE_URL. The API serves the built storefront (frontend/dist),
// so build the frontend first.
import { spawn } from 'node:child_process';
import { startTestStack, TEST_BASE_URL } from './stack.js';

const command = process.argv.slice(2).join(' ');
if (!command) {
  console.error('Usage: tsx tests/with-stack.ts <command> [args…]');
  process.exit(1);
}

let code = 1;
let stop: (() => Promise<void>) | null = null;
try {
  stop = await startTestStack();
  // Asynchronous spawn: the API runs in this process and must keep serving while the command runs.
  code = await new Promise<number>((resolve) => {
    const child = spawn(command, { stdio: 'inherit', shell: true, env: { ...process.env, E2E_BASE_URL: TEST_BASE_URL } });
    child.on('exit', (status) => resolve(status ?? 1));
    child.on('error', (err) => {
      console.error(err);
      resolve(1);
    });
  });
} catch (err) {
  console.error(err);
} finally {
  await stop?.();
}
process.exit(code);
