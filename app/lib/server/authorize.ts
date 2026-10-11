/**
 * Server-side role check for the dashboard routes (Doc 8 §4). Returns a 403
 * response to send back, or null when the signed-in user may proceed.
 */

import { can, type Permission } from '../permissions';
import { decodeClaims, requireTokens } from './fluxelApi';
import { errorResponse } from './dashboardSession';

export async function requirePermission(permission: Permission): Promise<Response | null> {
  try {
    const tokens = await requireTokens();
    const role = decodeClaims(tokens.access_token)?.roles?.[0];
    if (can(role, permission)) return null;
    return Response.json(
      { error: { code: 'forbidden', message: 'Your role does not allow this. Ask an owner or admin.' } },
      { status: 403 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
