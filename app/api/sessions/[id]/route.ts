/**
 * `/api/sessions/{id}` — revoke single session (DELETE) against `/v1/dashboard/sessions/{id}`.
 */

import { dashboardRequest } from '@/app/lib/server/fluxelApi';
import { errorResponse } from '@/app/lib/server/dashboardSession';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;

  try {
    await dashboardRequest(`/v1/dashboard/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
