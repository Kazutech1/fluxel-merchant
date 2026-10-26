'use client';

/**
 * Browser-side calls for the console, plus a small shared cache.
 *
 * Every request goes through the Next route handlers — `/api/v1/*` for the
 * merchant API (with the console's key for the chosen environment) and the
 * existing `/api/*` routes for the dashboard-session surface. Pages read data
 * with `useResource(key, fetcher)`; after a change they call `invalidate()`
 * so every page showing that data refetches.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';

export class ConsoleError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ConsoleError';
  }
}

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
      cache: 'no-store',
    });
  } catch {
    throw new ConsoleError(0, 'offline', 'Could not reach the server. Check your connection.');
  }
  if (response.status === 204) return null as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ConsoleError(response.status, err?.code ?? 'internal_error', friendly(err?.message, response.status));
  }
  return body as T;
}

/** The API's messages are written for developers; soften the ones merchants see most. */
function friendly(message: string | undefined, status: number): string {
  if (!message) return status >= 500 ? 'Something went wrong on our side. Try again in a moment.' : 'Something went wrong.';
  if (/name enquiry failed|unknown source|provider rejected/i.test(message)) {
    return 'The bank couldn’t confirm that account right now. Try again shortly — if it keeps failing, contact Fluxel support.';
  }
  return message.charAt(0).toUpperCase() + message.slice(1);
}

function v1Url(path: string, query?: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== '') params.set(k, String(v));
  const qs = params.toString();
  return `/api/v1/${path.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
}

/** The merchant API (`/v1/*`), through the console's key. */
export const v1 = {
  get: <T>(path: string, query?: Record<string, string | number | undefined>) => call<T>(v1Url(path, query)),
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    call<T>(v1Url(path), {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
      headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : undefined,
    }),
  put: <T>(path: string, body: unknown) => call<T>(v1Url(path), { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => call<T>(v1Url(path), { method: 'DELETE' }),
};

/** The dashboard-session routes (`/api/team`, `/api/sessions`, `/api/api-keys`, …). */
export const dash = {
  get: <T>(path: string) => call<T>(`/api/${path}`),
  post: <T>(path: string, body?: unknown) => call<T>(`/api/${path}`, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body: unknown) => call<T>(`/api/${path}`, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => call<T>(`/api/${path}`, { method: 'DELETE' }),
};

/* ------------------------------------------------------------------ */
/* Shared cache                                                        */
/* ------------------------------------------------------------------ */

interface Entry {
  data?: unknown;
  error?: ConsoleError;
  loading: boolean;
  /** Cached data that's out of date: kept, but not shown, until the refetch answers. */
  stale?: boolean;
  /** When the last successful answer arrived (ms). */
  fetchedAt?: number;
}

/**
 * An answer this recent counts as live, so a mount doesn't refetch it. Stops a
 * component that only appears once its data has loaded from re-hiding that
 * data on mount (and looping), and saves nested readers a duplicate request.
 */
const FRESH_MS = 2000;

const entries = new Map<string, Entry>();
const fetchers = new Map<string, () => Promise<unknown>>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function set(key: string, entry: Entry) {
  entries.set(key, entry);
  listeners.forEach((l) => l());
}

/** `stale`: hide the cached data until this fetch answers, so nobody sees an old copy. */
function load(key: string, { stale = false } = {}): Promise<void> {
  const prev = entries.get(key);
  const running = inflight.get(key);
  if (running) {
    if (stale && prev && !prev.stale) set(key, { ...prev, stale: true });
    return running;
  }
  const fetcher = fetchers.get(key);
  if (!fetcher) return Promise.resolve();
  set(key, { data: prev?.data, error: undefined, loading: true, stale: stale || prev?.stale, fetchedAt: prev?.fetchedAt });
  const p = fetcher()
    .then((data) => set(key, { data, loading: false, fetchedAt: Date.now() }))
    .catch((e: unknown) =>
      set(key, {
        data: prev?.data,
        loading: false,
        stale: entries.get(key)?.stale,
        fetchedAt: prev?.fetchedAt,
        error: e instanceof ConsoleError ? e : new ConsoleError(0, 'internal_error', 'Something went wrong.'),
      })
    )
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export interface Resource<T> {
  data: T | undefined;
  error: ConsoleError | undefined;
  /** True until a fresh answer — on first load and each time a section opens. Refreshes after a change keep showing the old data. */
  loading: boolean;
  reload: () => Promise<void>;
}

/**
 * Reads `key` through the shared cache. By default every component that
 * mounts with a key refetches it and shows loading until the answer arrives,
 * so opening a section always shows live data, never a copy from earlier.
 * Pass `{ fresh: false }` for reference data that rarely changes (assets,
 * banks, feature flags): those are fetched once and reused. `null` key = skip.
 */
export function useResource<T>(key: string | null, fetcher: () => Promise<T>, { fresh = true } = {}): Resource<T> {
  if (key) fetchers.set(key, fetcher);
  const entry = useSyncExternalStore(
    subscribe,
    () => (key ? entries.get(key) : undefined),
    () => undefined
  );
  useEffect(() => {
    if (!key) return;
    const entry = entries.get(key);
    if (!entry) void load(key);
    else if (fresh && Date.now() - (entry.fetchedAt ?? 0) > FRESH_MS) void load(key, { stale: true });
  }, [key, fresh]);
  const reload = useCallback(() => (key ? load(key) : Promise.resolve()), [key]);
  const data = entry?.stale ? undefined : (entry?.data as T | undefined);
  return {
    data,
    error: entry?.error,
    loading: Boolean(key) && (!entry || (entry.loading && data === undefined)),
    reload,
  };
}

/** Refetches every cached key that starts with any of `prefixes`. */
export function invalidate(...prefixes: string[]): void {
  for (const key of entries.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) void load(key);
  }
}

/** Forgets everything — on sign-out or business switch. */
export function clearCache(): void {
  entries.clear();
  fetchers.clear();
  listeners.forEach((l) => l());
}
