// Creates backend/.env from .env.example with freshly generated secrets (never overwrites an existing .env).
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
const examplePath = fileURLToPath(new URL('../.env.example', import.meta.url));

if (existsSync(envPath)) {
  console.log('backend/.env already exists — leaving it untouched.');
} else {
  const content = readFileSync(examplePath, 'utf8').replace(/__GENERATE__/g, () => randomBytes(48).toString('hex'));
  writeFileSync(envPath, content);
  console.log('Created backend/.env with generated secrets.');
}
