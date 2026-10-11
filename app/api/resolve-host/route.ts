/**
 * `GET /api/resolve-host?host=api.example.com` → the domain's current IP
 * addresses, so a merchant can allowlist "their server" by name. Browsers
 * can't do DNS lookups, so this runs here — and only for users who may
 * manage API keys, so it isn't an open DNS service.
 */

import { lookup } from 'node:dns/promises';

import { requirePermission } from '@/app/lib/server/authorize';

const HOSTNAME = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export async function GET(request: Request): Promise<Response> {
  const denied = await requirePermission('keys.manage');
  if (denied) return denied;

  const host = (new URL(request.url).searchParams.get('host') ?? '').trim().toLowerCase();
  if (!HOSTNAME.test(host)) {
    return Response.json({ error: { code: 'validation_failed', message: 'That isn’t a valid domain.' } }, { status: 422 });
  }

  try {
    const found = await lookup(host, { all: true, verbatim: true });
    const addresses = [...new Set(found.map((a) => a.address))];
    if (!addresses.length) throw new Error('none');
    return Response.json({ host, addresses });
  } catch {
    return Response.json(
      { error: { code: 'not_found', message: `Couldn’t find ${host}. Check the spelling, or enter its IP address instead.` } },
      { status: 404 }
    );
  }
}
