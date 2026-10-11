/**
 * `/api/team` — list (GET) and invite (POST) against `/v1/dashboard/team`.
 *
 * Scoped to the authenticated business session.
 * Handlers enforce role-based access (Owner or Admin acting user).
 */

import { randomBytes } from 'node:crypto';

import { dashboardRequest } from '@/app/lib/server/fluxelApi';
import { errorResponse, readField, readJsonBody, validationError } from '@/app/lib/server/dashboardSession';
import { requirePermission } from '@/app/lib/server/authorize';

export interface DashboardTeamMember {
  id: string;
  email: string;
  role: string;
}

export async function GET(): Promise<Response> {
  try {
    return Response.json(await dashboardRequest<DashboardTeamMember[]>('/v1/dashboard/team'));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const denied = await requirePermission('team.manage');
  if (denied) return denied;
  const body = await readJsonBody(request);
  const email = readField(body, 'email').trim().toLowerCase();
  const password = readField(body, 'password');
  const role = readField(body, 'role').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return validationError('A valid email address is required.');
  }

  // The backend has no invite email yet, so the inviter shares a temporary
  // password out of band. 18 random bytes → 24 url-safe characters.
  const tempPassword = password || randomBytes(18).toString('base64url');

  if (tempPassword.length < 8) {
    return validationError('Password must be at least 8 characters.');
  }

  try {
    const created = await dashboardRequest<DashboardTeamMember>('/v1/dashboard/team', {
      method: 'POST',
      body: JSON.stringify({ email, password: tempPassword, role }),
    });

    return Response.json({ ...created, temp_password: tempPassword }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
