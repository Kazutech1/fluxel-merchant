/**
 * `/api/sessions` — list (GET) and revoke all (DELETE) against `/v1/dashboard/sessions`.
 *
 * Scoped to the acting user's active sessions.
 */

import { dashboardRequest } from '@/app/lib/server/fluxelApi';
import { errorResponse } from '@/app/lib/server/dashboardSession';

export interface DashboardSession {
  id: string;
  created_at: string;
  expires_at: string;
}

export async function GET(): Promise<Response> {
  try {
    return Response.json(await dashboardRequest<DashboardSession[]>('/v1/dashboard/sessions'));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(): Promise<Response> {
  try {
    await dashboardRequest('/v1/dashboard/sessions', { method: 'DELETE' });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
