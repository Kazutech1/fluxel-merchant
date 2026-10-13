/**
 * The one place that speaks HTTP to the Fluxel Rust API.
 *
 * Runs on the Node.js runtime (route handlers' default) — `Buffer` below
 * assumes that. Nothing here is reachable from the browser.
 */

import { apiUrl } from './config';
import { clearSession, readSession, writeRotatedTokens } from './session';

import type { ApiErrorBody } from '@/app/types/auth';

/** A non-2xx from the API, carrying its envelope's `code` verbatim. */
export class FluxelApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'FluxelApiError';
  }
}

/** `POST /login` and `/register` both return this, plus ids we don't re-read. */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

/** Claims minted by `UserAuthServiceImpl::make_claims`. */
export interface DashboardClaims {
  sub: string;
  biz: string;
  roles: string[];
  typ: string;
  exp: number;
  iat: number;
  jti: string;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const err = (value as { error?: unknown }).error;
  return typeof err === 'object' && err !== null && typeof (err as { code?: unknown }).code === 'string';
}

/**
 * Unauthenticated call. Throws `FluxelApiError` on any non-2xx so callers can
 * branch on `status`/`code` instead of re-parsing bodies.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
      cache: 'no-store',
    });
  } catch {
    // DNS failure, TLS error, the API being down — none of which produce a
    // response, so there is no envelope to read.
    throw new FluxelApiError(503, 'provider_unavailable', 'Could not reach the Fluxel API.');
  }

  const text = await response.text();
  // A load balancer erroring ahead of the API answers in HTML, not the
  // envelope, so parsing is allowed to fail without masking the status.
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    if (isErrorBody(body)) {
      throw new FluxelApiError(response.status, body.error.code, body.error.message);
    }
    throw new FluxelApiError(response.status, 'internal_error', 'Unexpected API response.');
  }

  return body as T;
}

function withBearer(init: RequestInit, token: string): RequestInit {
  return { ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } };
}

/** Decodes a JWT payload without verifying it — the token came straight from the API. */
export function decodeClaims(token: string): DashboardClaims | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as DashboardClaims;
  } catch {
    return null;
  }
}

/** 30s of slack so a token that expires mid-flight is rotated before it is sent. */
function isUsable(token: string): boolean {
  const claims = decodeClaims(token);
  if (!claims) return false;
  return claims.exp * 1000 > Date.now() + 30_000;
}

/**
 * Trades the stored refresh token for a new pair.
 *
 * The API rotates refresh tokens single-use, and presenting an already-rotated
 * one revokes the whole family (`UserAuthServiceImpl::refresh`). So refreshing
 * happens here and only here, and any failure clears the jar rather than
 * leaving a half-dead session behind.
 *
 * A page fires several `/v1` calls at once, and each may find the access token
 * spent. They share one refresh per refresh token, and its result is kept for
 * a minute so a request that read the old cookie just after still gets the new
 * pair instead of replaying the spent token. (Per server process — enough for
 * one instance; several instances would need a shared store.)
 */
const refreshes = new Map<string, Promise<TokenPair>>();

function refreshOnce(refreshToken: string): Promise<TokenPair> {
  let pending = refreshes.get(refreshToken);
  if (!pending) {
    pending = apiRequest<TokenPair>('/v1/dashboard/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    refreshes.set(refreshToken, pending);
    setTimeout(() => refreshes.delete(refreshToken), 60_000).unref?.();
  }
  return pending;
}

async function rotate(refreshToken: string): Promise<TokenPair> {
  let pair: TokenPair;
  try {
    pair = await refreshOnce(refreshToken);
  } catch (cause) {
    await clearSession();
    throw cause instanceof FluxelApiError && cause.status === 503
      ? cause
      : new FluxelApiError(401, 'unauthorized', 'Your session has expired. Sign in again.');
  }

  await writeRotatedTokens(pair.access_token, pair.refresh_token);
  return pair;
}

/**
 * A token pair that is valid right now, rotating first if the access token is
 * spent. Returns both so callers that need the refresh token (logout) use the
 * post-rotation value rather than re-reading a cookie they just overwrote.
 */
export async function requireTokens(): Promise<TokenPair> {
  const stored = await readSession();

  if (stored.accessToken && stored.refreshToken && isUsable(stored.accessToken)) {
    return { access_token: stored.accessToken, refresh_token: stored.refreshToken };
  }

  if (!stored.refreshToken) {
    await clearSession();
    throw new FluxelApiError(401, 'unauthorized', 'You are not signed in.');
  }

  return rotate(stored.refreshToken);
}

/**
 * Authenticated call. Rotates proactively on a spent access token, and once
 * more reactively — the API mints JWTs from an ephemeral secret when
 * `DASHBOARD_JWT_SECRET` is unset, so a restart can invalidate a token that
 * still looks unexpired.
 */
export async function dashboardRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = await requireTokens();

  try {
    return await apiRequest<T>(path, withBearer(init, tokens.access_token));
  } catch (cause) {
    if (!(cause instanceof FluxelApiError) || cause.status !== 401) throw cause;
    const rotated = await rotate(tokens.refresh_token);
    return apiRequest<T>(path, withBearer(init, rotated.access_token));
  }
}
