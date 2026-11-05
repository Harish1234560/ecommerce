import { env, isProd } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

// Minimal structured logger: readable lines in development, one JSON object per line in production
// (ready for any log collector). No dependency needed for a single-process API.
function write(level: Level, message: string, context?: Record<string, unknown>) {
  if (level === 'debug' && isProd) return;
  if (env.NODE_ENV === 'test' && level !== 'error') return; // keep test output readable
  const stream = level === 'error' || level === 'warn' ? console.error : console.log;
  if (isProd) {
    stream(JSON.stringify({ time: new Date().toISOString(), level, message, ...context }));
    return;
  }
  const extra = context && Object.keys(context).length ? ` ${JSON.stringify(context)}` : '';
  stream(`${new Date().toISOString().slice(11, 19)} ${level.toUpperCase().padEnd(5)} ${message}${extra}`);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, error?: unknown, context?: Record<string, unknown>) =>
    write('error', message, {
      ...context,
      ...(error instanceof Error ? { error: error.message, stack: error.stack } : error !== undefined ? { error: String(error) } : {}),
    }),
};
