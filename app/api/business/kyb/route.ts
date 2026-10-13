/**
 * `POST /api/business/kyb` → `POST /v1/dashboard/business/kyb`.
 *
 * One-shot: `BusinessRepo::submit_kyb` matches `{status:"active", tier_1:false}`,
 * so a resubmission — or a submission from an already-approved business —
 * matches nothing and comes back 403. The API returns only `{message}`, so the
 * business is re-read afterwards to get the new `kyb_pending` status back to
 * the client in one round trip.
 */

import { dashboardRequest } from '@/app/lib/server/fluxelApi';
import { errorResponse, readJsonBody } from '@/app/lib/server/dashboardSession';

import type { AuthBusiness } from '@/app/types/auth';

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const details = (body as { details?: unknown } | null)?.details;

  if (typeof details !== 'object' || details === null) {
    return Response.json(
      { error: { code: 'validation_failed', message: 'KYB details are required.' } },
      { status: 422 }
    );
  }

  try {
    const result = await dashboardRequest<{ message: string }>('/v1/dashboard/business/kyb', {
      method: 'POST',
      body: JSON.stringify({ details }),
    });

    const business = await dashboardRequest<AuthBusiness>('/v1/dashboard/business');
    return Response.json({ message: result.message, business });
  } catch (error) {
    return errorResponse(error);
  }
}
