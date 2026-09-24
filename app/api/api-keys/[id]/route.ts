/**
 * `DELETE /api/api-keys/{id}` → `DELETE /v1/dashboard/keys/{id}`.
 *
 * Revocation is scoped by business id in `AuthRepo::revoke`, so one tenant can
 * never revoke another's key; an unknown id comes back 404. Effect is
 * immediate, though the API's own auth cache can lag by up to 30 seconds.
 */

import { dashboardRequest } from '@/app/lib/server/fluxelApi';
import { errorResponse } from '@/app/lib/server/dashboardSession';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;

  try {
    await dashboardRequest(`/v1/dashboard/keys/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
