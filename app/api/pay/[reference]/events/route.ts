/**
 * `GET /api/pay/{reference}/events` → `GET /v1/{crypto,fiat}-deposit-intents/{reference}/events`.
 *
 * Streaming passthrough for the hosted checkout's live status updates
 * (Fluxel-System dev_msg/2026-10-14-checkout-sse.md). The API emits an
 * `event: status` Server-Sent Event carrying the same JSON as the plain GET
 * whenever the intent's status changes, and closes the stream once the
 * intent reaches a terminal status.
 *
 * Same auth rules as the sibling `GET /api/pay/{reference}`: the merchant's
 * publishable key arrives as `x-fluxel-pk` and secret keys are refused. The
 * browser reads this with a streaming `fetch` rather than `EventSource`,
 * because `EventSource` can't send that header.
 */

import { apiUrl } from '@/app/lib/server/config';
import { isCryptoDisabled } from '@/app/lib/server/features';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

  let upstream: Response;
  try {
    upstream = await fetch(apiUrl(`${base}${encodeURIComponent(reference)}/events`), {
      headers: { authorization: `Bearer ${pk}`, accept: 'text/event-stream' },
      cache: 'no-store',
      // Payer closes the tab → abort the upstream connection too, so the
      // API's per-connection poll loop stops.
      signal: request.signal,
    });
  } catch {
    return error(503, 'provider_unavailable', 'Could not reach the Fluxel API.');
  }

  if (!upstream.ok || !upstream.body) {
    let body: unknown = null;
    try {
      body = await upstream.json();
    } catch {
      body = null;
    }
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    return error(upstream.status || 502, err?.code ?? 'internal_error', err?.message ?? 'Unexpected API response.');
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      // Stop nginx-style proxies from buffering the stream.
      'x-accel-buffering': 'no',
    },
  });
}
