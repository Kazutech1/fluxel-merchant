'use client';

/**
 * The platform's crypto switch, as the browser sees it (`GET /api/features`,
 * see `lib/server/features.ts`). Crypto is on by default: until the answer
 * arrives — or if it never does — crypto counts as enabled.
 */

import { useResource } from './console/client';

let pending: Promise<boolean> | null = null;

/** Resolves true when crypto must be hidden. Asked once per page load. */
export function cryptoDisabled(): Promise<boolean> {
  pending ??= fetch('/api/features', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((body: { crypto_disabled?: unknown } | null) => body?.crypto_disabled === true)
    .catch(() => false);
  return pending;
}

/** True unless the API has said crypto is off. */
export function useCryptoEnabled(): boolean {
  return useResource('features', cryptoDisabled, { fresh: false }).data !== true;
}

/** Naira is the only fiat asset; everything else is crypto. */
export const isFiatAsset = (code: string) => code === 'NGN';
