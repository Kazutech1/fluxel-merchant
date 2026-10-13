/**
 * The console's calls to `/v1` (balances, transactions, links, payouts,
 * webhooks …). The API accepts the dashboard JWT there, so they go out with
 * the signed-in user's session token, rotated as needed by `dashboardRequest`.
 *
 * The proxy in `app/api/v1` still checks the user's role before forwarding,
 * so a page gets a clear 403 instead of a half-loaded screen.
 */

import { dashboardRequest, decodeClaims, FluxelApiError, requireTokens } from './fluxelApi';

/** The signed-in user's business and role, for permission checks. */
export async function signedInActor(): Promise<{ biz: string; role: string }> {
  const tokens = await requireTokens();
  const claims = decodeClaims(tokens.access_token);
  if (!claims) throw new FluxelApiError(401, 'unauthorized', 'You are not signed in.');
  return { biz: claims.biz, role: claims.roles?.[0] ?? '' };
}

export const v1Request = dashboardRequest;
