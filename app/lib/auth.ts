/**
 * Browser-side auth calls.
 *
 * These hit the route handlers in `app/api/auth/`, never the Rust API — the
 * tokens live in httpOnly cookies the browser attaches automatically and no
 * page script can read. See `lib/server/config.ts` for why.
 */

import type { AuthSession, SessionResponse } from '@/app/types/auth';

/** A failed auth call, carrying the API envelope's `code` for callers that branch on it. */
export class AuthRequestError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

const OFFLINE = new AuthRequestError(
  'provider_unavailable',
  'Could not reach the server. Check your connection and try again.'
);

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw OFFLINE;
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = body as { error?: { code?: string; message?: string } } | null;
    throw new AuthRequestError(
      envelope?.error?.code ?? 'internal_error',
      envelope?.error?.message ?? 'Something went wrong. Try again.'
    );
  }

  return body as T;
}

export function login(email: string, password: string, remember: boolean): Promise<AuthSession> {
  return call<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, remember }),
  });
}

export function register(
  email: string,
  password: string,
  businessName: string,
  remember: boolean
): Promise<AuthSession> {
  return call<AuthSession>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, business_name: businessName, remember }),
  });
}

export function logout(): Promise<void> {
  return call<void>('/api/auth/logout', { method: 'POST' });
}

/**
 * Restores the session on a cold load. Resolves to `{ authenticated: false }`
 * rather than throwing when there is no session — being signed out is not an
 * error. A refresh-token rotation, if one is needed, happens server-side
 * inside this call.
 */
export function fetchSession(): Promise<SessionResponse> {
  return call<SessionResponse>('/api/auth/session');
}
