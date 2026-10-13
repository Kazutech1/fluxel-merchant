/**
 * `GET /api/console` — what the browser may know about the dashboard's own
 * keys: the checkout key's id (so Developers can label it) and the API host
 * for code samples.
 *
 * `GET /api/console?publishable=1` also returns the publishable key, creating
 * it on first use — checkout links carry it, and it's read-only by design.
 */

import { FLUXEL_API_URL } from '@/app/lib/server/config';
import { checkoutKeyIds, ensurePublishableKey } from '@/app/lib/server/checkoutKey';
import { errorResponse } from '@/app/lib/server/dashboardSession';

export async function GET(request: Request): Promise<Response> {
  try {
    const wantPk = new URL(request.url).searchParams.get('publishable') === '1';
    const publishableKey = wantPk ? await ensurePublishableKey() : undefined;
    return Response.json({ publishableKey, keyIds: await checkoutKeyIds(), apiBase: FLUXEL_API_URL });
  } catch (error) {
    return errorResponse(error);
  }
}
