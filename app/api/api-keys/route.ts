/**
 * `/api/api-keys` — list (GET) and create (POST) against `/v1/dashboard/keys`.
 *
 * Listing returns only *active* keys — the API filters revoked ones out, which
 * is why the rows carry no status field.
 *
 * The Live gate is enforced here because the Rust handler does not enforce it:
 * `create_key` never checks `tier_1`, so a sandbox business can mint an
 * `sk_live_…` that `tenant_context_middleware` then rejects on first use.
 * Better to refuse the key than hand over one that cannot work.
 */

import { dashboardRequest } from '@/app/lib/server/fluxelApi';
import { errorResponse, readField, readJsonBody } from '@/app/lib/server/dashboardSession';

import type { AuthBusiness } from '@/app/types/auth';
import type { ApiKeySummary, CreatedApiKey } from '@/app/types/business';

export async function GET(): Promise<Response> {
  try {
    return Response.json(await dashboardRequest<ApiKeySummary[]>('/v1/dashboard/keys'));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const keyClass = readField(body, 'key_class');
  const env = readField(body, 'env');

  if (keyClass !== 'publishable' && keyClass !== 'secret') {
    return Response.json(
      { error: { code: 'validation_failed', message: 'Choose a publishable or secret key.' } },
      { status: 422 }
    );
  }
  if (env !== 'test' && env !== 'live') {
    return Response.json(
      { error: { code: 'validation_failed', message: 'Choose the test or live environment.' } },
      { status: 422 }
    );
  }

  try {
    if (env === 'live') {
      const business = await dashboardRequest<AuthBusiness>('/v1/dashboard/business');
      if (!business.tier_1) {
        return Response.json(
          {
            error: {
              code: 'validation_failed',
              message:
                'Live keys need KYB approval. Submit KYB in Settings — until it is approved, live keys are rejected on first use.',
            },
          },
          { status: 422 }
        );
      }
    }

    const created = await dashboardRequest<CreatedApiKey>('/v1/dashboard/keys', {
      method: 'POST',
      body: JSON.stringify({ key_class: keyClass, env }),
    });

    return Response.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
