/**
 * `/api/api-keys/{id}/ip-allowlist` — update CIDR allowlist (PUT)
 * against `/v1/dashboard/keys/{id}/ip-allowlist`.
 */

import { dashboardRequest } from '@/app/lib/server/fluxelApi';
import { errorResponse, readJsonBody } from '@/app/lib/server/dashboardSession';
import { requirePermission } from '@/app/lib/server/authorize';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const denied = await requirePermission('keys.manage');
  if (denied) return denied;
  const { id } = await context.params;
  const body = (await readJsonBody(request)) as { cidrs?: unknown } | null;
  const cidrs = Array.isArray(body?.cidrs)
    ? body.cidrs.filter((c): c is string => typeof c === 'string')
    : [];

  try {
    const res = await dashboardRequest<{ id: string; ip_allowlist: string[] }>(
      `/v1/dashboard/keys/${encodeURIComponent(id)}/ip-allowlist`,
      {
        method: 'PUT',
        body: JSON.stringify({ cidrs }),
      }
    );
    return Response.json(res);
  } catch (error) {
    return errorResponse(error);
  }
}
