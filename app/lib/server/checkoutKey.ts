/**
 * The publishable key that checkout links carry (`/pay/{intent}?c=…`).
 *
 * Shoppers aren't signed in, so the hosted checkout reads the intent with the
 * merchant's `pk_` key, never the JWT. The API only returns a key's plaintext
 * when it's created and has no way to fetch it later, so the dashboard creates
 * one the first time a link needs it and remembers it:
 *
 *   - in memory, shared by every signed-in user of the business on this server;
 *   - in a cookie bound to the business id, for after a restart.
 *
 * It's never revoked on sign-out: links already sent to customers use it.
 * Publishable keys are read-only and public by design, so the cookie isn't
 * encrypted.
 */

import { cookies } from 'next/headers';

import { IS_PRODUCTION } from './config';
import { dashboardRequest, FluxelApiError } from './fluxelApi';
import { readSession } from './session';
import { signedInActor } from './v1';

interface CheckoutKey {
  biz: string;
  pk: string;
  pkId: string;
}

const COOKIE = 'fluxel_pk';
const MAX_AGE = 365 * 24 * 60 * 60;

const known = new Map<string, CheckoutKey>();
const inflight = new Map<string, Promise<CheckoutKey>>();

async function fromCookie(biz: string): Promise<CheckoutKey | null> {
  try {
    const value = JSON.parse((await cookies()).get(COOKIE)?.value ?? 'null') as CheckoutKey | null;
    return value?.biz === biz && value.pk?.startsWith('pk_') ? value : null;
  } catch {
    return null;
  }
}

async function remember(key: CheckoutKey): Promise<void> {
  known.set(key.biz, key);
  const { persist } = await readSession();
  (await cookies()).set(COOKIE, JSON.stringify(key), {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    path: '/',
    ...(persist ? { maxAge: MAX_AGE } : {}),
  });
}

async function create(biz: string): Promise<CheckoutKey> {
  try {
    const created = await dashboardRequest<{ id: string; plaintext: string }>('/v1/dashboard/keys', {
      method: 'POST',
      body: JSON.stringify({ key_class: 'publishable', env: 'test' }),
    });
    return { biz, pk: created.plaintext, pkId: created.id };
  } catch (cause) {
    if (cause instanceof FluxelApiError && /key limit/i.test(cause.message)) {
      throw new FluxelApiError(
        409,
        'checkout_key_limit',
        'Checkout links need a sandbox publishable key, and your account already has the maximum of 2. Revoke one in Developers → API keys, then try again.'
      );
    }
    throw cause;
  }
}

/** The business's checkout key, created the first time it's needed. */
export async function ensurePublishableKey(): Promise<string> {
  const { biz } = await signedInActor();
  const mine = await fromCookie(biz);
  const cached = known.get(biz) ?? mine;
  if (cached) {
    if (mine?.pkId === cached.pkId) known.set(biz, cached);
    else await remember(cached);
    return cached.pk;
  }
  let pending = inflight.get(biz);
  if (!pending) {
    pending = create(biz).finally(() => inflight.delete(biz));
    inflight.set(biz, pending);
  }
  const key = await pending;
  await remember(key);
  return key.pk;
}

/** Id of the checkout key, so Developers can label it. */
export async function checkoutKeyIds(): Promise<string[]> {
  const { biz } = await signedInActor();
  const key = known.get(biz) ?? (await fromCookie(biz));
  return key ? [key.pkId] : [];
}
