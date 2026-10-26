/**
 * The publishable key that checkout links carry (`/pay/{intent}?c=…`).
 *
 * Shoppers aren't signed in, so the hosted checkout reads the intent with the
 * merchant's `pk_` key, never the JWT. The API only returns a key's plaintext
 * when it's created and has no way to fetch it later, so the dashboard creates
 * one the first time a link needs it and remembers it:
 *
 *   - in memory, shared by every signed-in user of the business on this server;
 *   - in a year-long cookie bound to the business id, for after a restart.
 *
 * The cookie outlives the login on purpose, "remember me" or not: losing it
 * means minting another key, and the API allows only two per type — a
 * browser-session cookie used to burn one every time the browser closed.
 *
 * At that limit the merchant can hand us a sandbox publishable key they
 * already hold (`adoptPublishableKey`); we check it's one of theirs.
 *
 * It's never revoked on sign-out: links already sent to customers use it.
 * Publishable keys are read-only and public by design, so the cookie isn't
 * encrypted.
 */

import { cookies } from 'next/headers';

import { IS_PRODUCTION } from './config';
import { apiRequest, dashboardRequest, FluxelApiError } from './fluxelApi';
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
  (await cookies()).set(COOKIE, JSON.stringify(key), {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    path: '/',
    maxAge: MAX_AGE,
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
        'Checkout links need a sandbox publishable key. Your account already has the maximum of 2, and Fluxel only shows a key once, when it’s created — so paste one you saved, or revoke one in Developers → API keys.'
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

interface KeySummary {
  id: string;
  display_prefix: string;
  last4: string;
  env: string;
  key_class: string;
}

/**
 * Adopts a sandbox publishable key the merchant already has, for when the
 * two-key limit stops us minting one. It must match one of this business's
 * active keys (prefix + last four) and actually work against the API.
 */
export async function adoptPublishableKey(pk: string): Promise<void> {
  const { biz } = await signedInActor();
  const key = pk.trim();
  const invalid = (message: string) => new FluxelApiError(422, 'validation_failed', message);
  if (!/^pk_test_[A-Za-z0-9]+$/.test(key)) throw invalid('That isn’t a sandbox publishable key — it should start with pk_test_.');

  const keys = await dashboardRequest<KeySummary[]>('/v1/dashboard/keys');
  const match = keys.find(
    (k) => k.key_class === 'publishable' && k.env === 'test' && key.startsWith(k.display_prefix) && key.endsWith(k.last4)
  );
  if (!match) throw invalid('That key doesn’t match any active sandbox publishable key on this account.');

  try {
    await apiRequest('/v1/payment-links?limit=1', { headers: { authorization: `Bearer ${key}` } });
  } catch (cause) {
    if (cause instanceof FluxelApiError && cause.status === 401) throw invalid('Fluxel didn’t accept that key. Check you copied all of it.');
    throw cause;
  }

  await remember({ biz, pk: key, pkId: match.id });
}
