/**
 * Platform switches the API controls — today only `crypto_disabled`.
 *
 * `GET /v1/platform/features` → `{ crypto_disabled: boolean }`. Public (no
 * key), because the sign-in page and the hosted checkout need it too.
 * Crypto is on by default: only an explicit `crypto_disabled: true` hides it,
 * so a missing or failing endpoint leaves crypto visible.
 */

import { apiRequest } from './fluxelApi';

/** Re-ask the API at most once a minute per server process. */
const TTL_MS = 60_000;

let cached: { value: boolean; at: number } | null = null;

/** True when the console must show nothing about crypto. Any failure reads as enabled. */
export async function isCryptoDisabled(): Promise<boolean> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  let value = false;
  try {
    const body = await apiRequest<{ crypto_disabled?: unknown }>('/v1/platform/features');
    value = body?.crypto_disabled === true;
  } catch {
    value = false;
  }
  cached = { value, at: Date.now() };
  return value;
}

/** `/v1` paths that only exist for crypto: deposit intents, withdrawals, deposit addresses. */
export function isCryptoPath(path: string): boolean {
  return /(^|\/)(crypto-[a-z-]+|addresses)(\/|$)/.test(path.replace(/^\/+/, ''));
}
