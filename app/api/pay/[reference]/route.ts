/**
 * `GET /api/pay/{reference}` → `GET /v1/{crypto,fiat}-deposit-intents/{reference}`.
 *
 * Backs the hosted checkout. The payer is anonymous, so the call is made with
 * the merchant's *publishable* key, which the merchant put in the checkout
 * link and the page forwards as `x-fluxel-pk`. Publishable keys are read-only
 * (the API rejects them for intent creation), and a secret key is refused here
 * outright so a merchant who pastes the wrong key into a link doesn't get it
 * used.
 */

import { FluxelApiError, apiRequest } from '@/app/lib/server/fluxelApi';
import { isCryptoDisabled } from '@/app/lib/server/features';

const PATHS: Record<string, string> = {
  cdi: '/v1/crypto-deposit-intents/',
  fdi: '/v1/fiat-deposit-intents/',
};

function error(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const prefix = reference.split('_')[0];
  const base = PATHS[prefix];
  if (!base || (prefix === 'cdi' && (await isCryptoDisabled()))) return error(404, 'not_found', 'Unknown payment reference.');

  const pk = request.headers.get('x-fluxel-pk') ?? '';
  if (!pk.startsWith('pk_')) {
    return error(401, 'unauthorized', 'Checkout links must carry a publishable (pk_) key.');
  }

  try {
    const intent = await apiRequest(`${base}${encodeURIComponent(reference)}`, {
      headers: { authorization: `Bearer ${pk}` },
    });
    return Response.json(intent);
  } catch (e) {
    if (e instanceof FluxelApiError) return error(e.status, e.code, e.message);
    throw e;
  }
}
