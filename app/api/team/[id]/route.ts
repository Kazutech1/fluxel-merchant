/**
 * `/api/team/{id}` — update role (PUT) and remove member (DELETE)
 * against `/v1/dashboard/team/{id}`.
 */

import { dashboardRequest } from '@/app/lib/server/fluxelApi';
import { errorResponse, readField, readJsonBody, validationError } from '@/app/lib/server/dashboardSession';
import type { DashboardTeamMember } from '../route';
import { requirePermission } from '@/app/lib/server/authorize';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const denied = await requirePermission('team.manage');
  if (denied) return denied;
  const { id } = await context.params;
  const body = await readJsonBody(request);
  const role = readField(body, 'role').trim().toLowerCase();

  if (!role) {
    return validationError('A valid role is required.');
  }

  try {
    const updated = await dashboardRequest<DashboardTeamMember>(
      `/v1/dashboard/team/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }
    );
    return Response.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const denied = await requirePermission('team.manage');
  if (denied) return denied;
  const { id } = await context.params;

  try {
    await dashboardRequest(`/v1/dashboard/team/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
