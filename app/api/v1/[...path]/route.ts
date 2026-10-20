/**
 * `/api/v1/*` → `/v1/*` on the Fluxel API, with the signed-in user's JWT
 * (see `lib/server/v1.ts`).
 *
 * This is the authorization point for dashboard-initiated `/v1` calls: the
 * signed-in user's role (from their JWT) must hold the permission the route
 * needs (Doc 8 §4, `lib/permissions.ts`). Routes the console doesn't use are
 * refused rather than forwarded.
 */

import { randomUUID } from 'node:crypto';

import { can, permissionForV1 } from '@/app/lib/permissions';
import { signedInActor, v1Request } from '@/app/lib/server/v1';
import { errorResponse } from '@/app/lib/server/dashboardSession';
import { FluxelApiError, isRouteClosedToDashboard } from '@/app/lib/server/fluxelApi';

type Ctx = { params: Promise<{ path: string[] }> };

function refuse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

async function handle(request: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  const url = new URL(request.url);
  const subpath = path.map(encodeURIComponent).join('/');
  const permission = permissionForV1(request.method, subpath);
  if (!permission) return refuse(404, 'not_found', 'This endpoint is not available from the dashboard.');

  try {
    const actor = await signedInActor();
    if (!can(actor.role, permission)) {
      return refuse(403, 'forbidden', 'Your role does not allow this. Ask an owner or admin.');
    }

    const query = url.searchParams.toString();
    const headers: Record<string, string> = {};
    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      body = (await request.text()) || '{}';
      // Writes are idempotent on the API side; a retried click must not double-pay.
      headers['idempotency-key'] = request.headers.get('idempotency-key') || randomUUID();
    }

    const result = await v1Request<unknown>(`/v1/${subpath}${query ? `?${query}` : ''}`, {
      method: request.method,
      headers,
      body,
    });
    if (result === null) return new Response(null, { status: 204 });
    return Response.json(result, { status: request.method === 'POST' ? 201 : 200 });
  } catch (error) {
    if (error instanceof FluxelApiError && isRouteClosedToDashboard(error)) {
      return refuse(
        501,
        'dashboard_route_unavailable',
        'This isn’t available from the dashboard yet — Fluxel’s API still needs to enable it for signed-in users.'
      );
    }
    return errorResponse(error);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
