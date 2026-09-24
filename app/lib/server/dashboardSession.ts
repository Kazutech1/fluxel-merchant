/**
 * Turns a token pair into the session payload the dashboard renders, and
 * normalises every failure into the same error envelope the Rust API uses so
 * the client has exactly one error shape to handle.
 */

import { apiRequest, decodeClaims, FluxelApiError } from './fluxelApi';
import { clearSession } from './session';

import type { AuthBusiness, AuthSession } from '@/app/types/auth';

/** `GET /v1/dashboard/business` (`routes/dashboard/mod.rs::get_business`). */
async function fetchBusiness(accessToken: string): Promise<AuthBusiness> {
  return apiRequest<AuthBusiness>('/v1/dashboard/business', {
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Builds the session from the access token's claims plus the business record.
 *
 * `GET /business` doubles as the gate the dashboard middleware applies: a
 * frozen or rejected business is refused there, so a login that gets a token
 * but can't read its own business is not a usable session and is surfaced as
 * the 401 it is.
 */
export async function buildSession(accessToken: string, email: string): Promise<AuthSession> {
  const claims = decodeClaims(accessToken);
  if (!claims) {
    throw new FluxelApiError(502, 'internal_error', 'The API returned a token we could not read.');
  }

  const business = await fetchBusiness(accessToken);

  return {
    user: { id: claims.sub, email, roles: claims.roles ?? [] },
    business,
  };
}

/** Renders any thrown value as the API's `{ error: { code, message } }` envelope. */
export function errorResponse(error: unknown): Response {
  if (error instanceof FluxelApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status }
    );
  }

  console.error('[auth] unhandled route handler error', error);
  return Response.json(
    { error: { code: 'internal_error', message: 'Something went wrong. Try again.' } },
    { status: 500 }
  );
}

export function validationError(message: string): Response {
  return Response.json({ error: { code: 'validation_failed', message } }, { status: 422 });
}

/**
 * A login that authenticated but can't be used (frozen business, unreadable
 * token) must not leave tokens behind, or the next page load resurrects a
 * broken session.
 */
export async function abandonSession(error: unknown): Promise<Response> {
  await clearSession();
  return errorResponse(error);
}

/** Reads and trims a string field from an untrusted JSON body. */
export function readField(body: unknown, key: string): string {
  if (typeof body !== 'object' || body === null) return '';
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
