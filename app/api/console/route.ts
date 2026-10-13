/**
 * `GET /api/console` — connects this browser to `/v1` (minting its key on
 * first use) and returns what the browser may know about the console's keys:
 * their ids (so Developers can label them) and the API host for code samples.
 *
 * `GET /api/console?publishable=1` also returns the publishable key, minting
 * it on first use — checkout links carry it, and it's read-only by design.
 * The secret key never leaves the server.
 */

import { FLUXEL_API_URL } from '@/app/lib/server/config';
import { consoleKeyIds, ensureConsoleSecret, ensurePublishableKey } from '@/app/lib/server/consoleKeys';
import { errorResponse } from '@/app/lib/server/dashboardSession';

export async function GET(request: Request): Promise<Response> {
  try {
    // Connect first, so the browser holds the key cookie before it fires its parallel data requests.
    await ensureConsoleSecret();
    const wantPk = new URL(request.url).searchParams.get('publishable') === '1';
    const publishableKey = wantPk ? await ensurePublishableKey() : undefined;
    return Response.json({ publishableKey, keyIds: await consoleKeyIds(), apiBase: FLUXEL_API_URL });
  } catch (error) {
    return errorResponse(error);
  }
}
