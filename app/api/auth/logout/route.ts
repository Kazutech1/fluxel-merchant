/**
 * `POST /api/auth/logout` → `POST /v1/dashboard/auth/logout`, then clears the jar.
 *
 * Revoking server-side is best effort: an expired or already-revoked refresh
 * token still has to end in a signed-out browser, so the local clear happens
 * whatever the API says.
 */

import { apiRequest, requireTokens } from '@/app/lib/server/fluxelApi';
import { clearSession } from '@/app/lib/server/session';

export async function POST(): Promise<Response> {
  try {
    // Ordered deliberately: `requireTokens` may rotate, and the token handed
    // to the API has to be the surviving one, not the one it just replaced.
    const tokens = await requireTokens();
    await apiRequest('/v1/dashboard/auth/logout', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokens.access_token}` },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });
  } catch (error) {
    console.warn('[auth] server-side logout failed, clearing cookies anyway', error);
  }

  await clearSession();
  return new Response(null, { status: 204 });
}
