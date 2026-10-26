/**
 * `GET /api/features` → `{ crypto_disabled }`, read from `GET /v1/platform/features`.
 * Public: the sign-in page and the hosted checkout read it before anyone signs in.
 */

import { isCryptoDisabled } from '@/app/lib/server/features';

export async function GET() {
  return Response.json({ crypto_disabled: await isCryptoDisabled() });
}
