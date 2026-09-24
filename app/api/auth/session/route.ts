/**
 * `GET /api/auth/session` — restores the session on a cold page load.
 *
 * Being signed out is a normal answer, not an error, so anything that fails
 * resolves to `{ authenticated: false }` with the jar cleared. A token
 * rotation, if the 15-minute access token has lapsed, happens inside
 * `requireTokens` and is invisible to the caller.
 *
 * Tokens are acquired exactly once here, not via `dashboardRequest`: that
 * helper would fetch them again to read the claims, and since refresh tokens
 * are single-use a second acquisition can mean a second rotation for one page
 * load. One acquisition, one optional rotation.
 */

import { apiRequest, decodeClaims, FluxelApiError, requireTokens } from '@/app/lib/server/fluxelApi';
import { clearSession, readSession } from '@/app/lib/server/session';

import type { AuthBusiness, SessionResponse } from '@/app/types/auth';

const SIGNED_OUT: SessionResponse = { authenticated: false };

export async function GET(): Promise<Response> {
  const stored = await readSession();
  if (!stored.refreshToken && !stored.accessToken) {
    return Response.json(SIGNED_OUT);
  }

  try {
    const tokens = await requireTokens();
    const claims = decodeClaims(tokens.access_token);
    if (!claims) throw new FluxelApiError(502, 'internal_error', 'unreadable session token');

    const business = await apiRequest<AuthBusiness>('/v1/dashboard/business', {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });

    return Response.json({
      authenticated: true,
      user: { id: claims.sub, email: stored.email ?? '', roles: claims.roles ?? [] },
      business,
    } satisfies SessionResponse);
  } catch {
    await clearSession();
    return Response.json(SIGNED_OUT);
  }
}
