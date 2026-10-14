// HTTP client for the REST API: bearer token, silent session refresh, and one error type.
// Components never use this directly — they call the functions in src/services.

const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** Per-field validation messages from the server. */
    public errors?: Record<string, string>,
    /** Stable machine-readable code (e.g. OUT_OF_STOCK). */
    public code?: string,
  ) {
    super(message);
  }
  get isNetwork() {
    return this.status === 0;
  }
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  [key: string]: unknown;
}

export interface Paged<T, M = PageMeta> {
  data: T;
  meta: M;
}

export type Params = Record<string, string | number | boolean | null | undefined>;

// Response envelopes used by the API.
interface SuccessBody<T> {
  success: true;
  message: string;
  data: T;
  meta?: unknown;
}
interface ErrorBody {
  success: false;
  message: string;
  error?: { code?: string; fields?: Record<string, string> };
}

// The access token lives only in memory; the refresh token is an httpOnly cookie.
let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;
let refreshing: Promise<boolean> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setSessionLostHandler = (fn: () => void) => {
  onSessionLost = fn;
};

function buildUrl(path: string, params?: Params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const query = qs.toString();
  return `${API_BASE}${path}${query ? `?${query}` : ''}`;
}

// Exchanges the refresh cookie for a new access token. Concurrent callers share one request.
async function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) return false;
      const json = (await res.json()) as SuccessBody<{ accessToken: string }>;
      accessToken = json.data.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

interface RequestOptions {
  params?: Params;
  body?: unknown;
  form?: FormData;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function send(method: string, path: string, opts: RequestOptions, retried = false): Promise<Response> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const hadToken = !!accessToken;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.params), {
      method,
      headers,
      credentials: 'same-origin',
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('Network error. Check your connection and try again.', 0);
  }

  // Expired access token → refresh once and replay the request.
  if (res.status === 401 && hadToken && !retried) {
    if (await refreshSession()) return send(method, path, opts, true);
    accessToken = null;
    onSessionLost?.();
  }
  return res;
}

const FALLBACK_MESSAGE: Record<number, string> = {
  401: 'Please sign in to continue',
  403: 'You do not have permission to do that',
  404: 'Not found',
};

async function toApiError(res: Response): Promise<ApiError> {
  const json = (await res.json().catch(() => null)) as ErrorBody | null;
  const fallback = FALLBACK_MESSAGE[res.status] ?? (res.status >= 500 ? 'Something went wrong on our side. Please try again.' : 'Request failed');
  return new ApiError(json?.message ?? fallback, res.status, json?.error?.fields, json?.error?.code);
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<{ data: T; meta?: unknown }> {
  const res = await send(method, path, opts);
  if (!res.ok) throw await toApiError(res);
  const json = (await res.json()) as SuccessBody<T>;
  return { data: json.data, meta: json.meta };
}

export const api = {
  get: async <T>(path: string, params?: Params, signal?: AbortSignal) => (await request<T>('GET', path, { params, signal })).data,
  getPaged: async <T, M = PageMeta>(path: string, params?: Params, signal?: AbortSignal): Promise<Paged<T, M>> => {
    const r = await request<T>('GET', path, { params, signal });
    return { data: r.data, meta: r.meta as M };
  },
  post: async <T>(path: string, body?: unknown, headers?: Record<string, string>) => (await request<T>('POST', path, { body: body ?? {}, headers })).data,
  put: async <T>(path: string, body?: unknown) => (await request<T>('PUT', path, { body: body ?? {} })).data,
  patch: async <T>(path: string, body?: unknown) => (await request<T>('PATCH', path, { body: body ?? {} })).data,
  delete: async <T>(path: string) => (await request<T>('DELETE', path)).data,

  upload: async <T>(path: string, form: FormData) => (await request<T>('POST', path, { form })).data,

  // Authenticated file download (e.g. an invoice PDF), saved through a temporary link.
  download: async (path: string, filename: string) => {
    const res = await send('GET', path, {});
    if (!res.ok) throw await toApiError(res);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

export const errorMessage = (err: unknown, fallback = 'Something went wrong') => (err instanceof Error && err.message ? err.message : fallback);
