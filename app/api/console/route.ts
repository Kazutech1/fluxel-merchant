/**
 * `GET /api/console` — what the browser may know about the dashboard's own
 * keys: the checkout key's id (so Developers can label it) and the API host
 * for code samples.
 *
 * `GET /api/console?publishable=1` also returns the publishable key, creating
 * it on first use — checkout links carry it, and it's read-only by design.
 *
 * `POST /api/console` `{publishableKey}` adopts a key the merchant already
 * has, for when the account is at its key limit.
 */

import { FLUXEL_API_URL } from '@/app/lib/server/config';
import { checkoutKeyIds, ensurePublishableKey, adoptPublishableKey } from '@/app/lib/server/checkoutKey';
import { errorResponse, readJsonBody } from '@/app/lib/server/dashboardSession';

export async function GET(request: Request): Promise<Response> {
  try {
    const wantPk = new URL(request.url).searchParams.get('publishable') === '1';
    const publishableKey = wantPk ? await ensurePublishableKey() : undefined;
    return Response.json({ publishableKey, keyIds: await checkoutKeyIds(), apiBase: FLUXEL_API_URL });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await readJsonBody(request)) as { publishableKey?: unknown } | null;
    await adoptPublishableKey(typeof body?.publishableKey === 'string' ? body.publishableKey : '');
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
