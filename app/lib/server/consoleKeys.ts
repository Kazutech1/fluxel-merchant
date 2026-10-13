/**
 * The console's bridge to `/v1`.
 *
 * Everything under `/v1` (balances, transactions, links, payouts, webhooks …)
 * authenticates with a merchant API key only — the dashboard JWT is refused
 * there (`key_invalid`). Until the API accepts dashboard sessions on `/v1`,
 * the server mints a key for the signed-in business through
 * `POST /v1/dashboard/keys` (which does accept the JWT) and keeps it:
 *
 *   - in an httpOnly cookie, AES-256-GCM encrypted — no page script or log
 *     line ever sees the secret;
 *   - bound to the business id, so a different login never reuses it;
 *   - revoked on logout, and re-minted if someone revokes it in Developers.
 *
 * It is always a *test* key: the API doesn't partition data by key
 * environment (TenantCtx has no env; `KeyEnv::Live` only adds a KYB gate), so
 * a test key sees exactly what a live key would and works before KYB.
 *
 * The API allows two active keys per class and environment (Doc 8 §1), so one
 * key is shared by every signed-in user of a business on this server — they
 * are all the same tenant, and the proxy in `app/api/v1` enforces each user's
 * role regardless of which key carries the call. That uses one sandbox secret
 * slot per business (two on a fresh restart at worst), plus one publishable
 * slot only once a checkout link is needed. It's still a bridge — see
 * `docs/dashboard-v1-access.md` for the backend change that retires it.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

import { IS_PRODUCTION } from './config';
import { apiRequest, dashboardRequest, decodeClaims, FluxelApiError, requireTokens } from './fluxelApi';
import { readSession } from './session';

interface ConsoleKeys {
  biz: string;
  sk: string;
  skId: string;
  pk?: string;
  pkId?: string;
}

interface CreatedKey {
  id: string;
  plaintext: string;
}

const COOKIE = 'fluxel_ck';
const MAX_AGE = 30 * 24 * 60 * 60;

/* ------------------------------------------------------------------ */
/* Cookie encryption                                                   */
/* ------------------------------------------------------------------ */

let warned = false;
function cipherKey(): Buffer {
  let secret = process.env.CONSOLE_COOKIE_SECRET ?? '';
  if (!secret) {
    if (IS_PRODUCTION) throw new Error('CONSOLE_COOKIE_SECRET must be set in production');
    if (!warned) {
      console.warn('[console] CONSOLE_COOKIE_SECRET is not set — using a development-only key');
      warned = true;
    }
    secret = 'fluxel-console-development-only-secret';
  }
  return createHash('sha256').update(secret).digest();
}

function seal(value: ConsoleKeys): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cipherKey(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

function open(raw: string | undefined): ConsoleKeys | null {
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', cipherKey(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const json = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
    return JSON.parse(json) as ConsoleKeys;
  } catch {
    return null; // tampered, old secret, or garbage — mint fresh
  }
}

/* ------------------------------------------------------------------ */
/* Keys                                                                */
/* ------------------------------------------------------------------ */

/** The signed-in user's business and role, for permission checks. */
export async function signedInActor(): Promise<{ biz: string; role: string }> {
  const tokens = await requireTokens();
  const claims = decodeClaims(tokens.access_token);
  if (!claims) throw new FluxelApiError(401, 'unauthorized', 'You are not signed in.');
  return { biz: claims.biz, role: claims.roles?.[0] ?? '' };
}

async function read(biz: string): Promise<ConsoleKeys | null> {
  const keys = open((await cookies()).get(COOKIE)?.value);
  return keys && keys.biz === biz ? keys : null;
}

async function write(keys: ConsoleKeys): Promise<void> {
  const { persist } = await readSession();
  (await cookies()).set(COOKIE, seal(keys), {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    path: '/',
    ...(persist ? { maxAge: MAX_AGE } : {}),
  });
}

async function mint(keyClass: 'secret' | 'publishable'): Promise<CreatedKey> {
  try {
    return await dashboardRequest<CreatedKey>('/v1/dashboard/keys', {
      method: 'POST',
      body: JSON.stringify({ key_class: keyClass, env: 'test' }),
    });
  } catch (cause) {
    if (cause instanceof FluxelApiError && /key limit/i.test(cause.message)) {
      throw new FluxelApiError(
        409,
        'console_key_limit',
        `Your account already has the maximum of 2 sandbox ${keyClass} keys, so the dashboard can’t connect. Revoke one in Developers → API keys, then reload.`
      );
    }
    throw cause;
  }
}

const revoke = (id: string) =>
  dashboardRequest(`/v1/dashboard/keys/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});

// One key per business, shared by its signed-in browsers on this server.
// Concurrent first requests share the same mint. The cookie is the fallback
// after a restart or on another server instance.
const inflight = new Map<string, Promise<ConsoleKeys>>();
const shared = new Map<string, ConsoleKeys>();

async function ensureSecret(biz: string): Promise<ConsoleKeys> {
  const known = shared.get(biz);
  if (known) {
    const mine = await read(biz);
    if (mine?.skId !== known.skId || (known.pk && !mine?.pk)) await write(known);
    return known;
  }
  const existing = await read(biz);
  if (existing) {
    shared.set(biz, existing);
    return existing;
  }
  let pending = inflight.get(biz);
  if (!pending) {
    pending = mint('secret')
      .then((sk) => {
        const keys = { biz, sk: sk.plaintext, skId: sk.id };
        shared.set(biz, keys);
        return keys;
      })
      .finally(() => inflight.delete(biz));
    inflight.set(biz, pending);
  }
  const keys = await pending;
  await write(keys);
  return keys;
}

/** Connects this browser to `/v1` (mints its key if needed). */
export async function ensureConsoleSecret(): Promise<void> {
  const { biz } = await signedInActor();
  await ensureSecret(biz);
}

/** The publishable half — minted only when a checkout link needs it. */
export async function ensurePublishableKey(): Promise<string> {
  const { biz } = await signedInActor();
  const keys = await ensureSecret(biz);
  if (keys.pk) return keys.pk;
  const pk = await mint('publishable');
  const next = { ...keys, pk: pk.plaintext, pkId: pk.id };
  shared.set(biz, next);
  await write(next);
  return pk.plaintext;
}

/**
 * On sign-out: revoke the business's console key (best effort) and forget it.
 * Any other signed-in browser simply mints a fresh one on its next call.
 */
export async function dropConsoleKeys(): Promise<void> {
  const jar = await cookies();
  const keys = open(jar.get(COOKIE)?.value);
  if (keys) {
    const current = shared.get(keys.biz) ?? keys;
    await revoke(current.skId);
    if (current.pkId) await revoke(current.pkId);
    shared.delete(keys.biz);
  }
  jar.delete(COOKIE);
}

/** Ids of the console's keys, so Developers can tell them apart. */
export async function consoleKeyIds(): Promise<string[]> {
  const mine = open((await cookies()).get(COOKIE)?.value);
  const keys = (mine && shared.get(mine.biz)) ?? mine;
  return keys ? [keys.skId, ...(keys.pkId ? [keys.pkId] : [])] : [];
}

/**
 * A `/v1` call with the console's secret key. If the key was revoked from
 * Developers (`key_invalid` / `key_revoked`), mint a new one once and retry.
 */
export async function v1Request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { biz } = await signedInActor();
  const call = (sk: string) => apiRequest<T>(path, { ...init, headers: { ...init.headers, authorization: `Bearer ${sk}` } });

  const keys = await ensureSecret(biz);
  try {
    return await call(keys.sk);
  } catch (cause) {
    if (!(cause instanceof FluxelApiError) || cause.status !== 401 || !/^key_/.test(cause.code)) throw cause;
    (await cookies()).delete(COOKIE);
    if (shared.get(biz)?.skId === keys.skId) shared.delete(biz);
    const fresh = await ensureSecret(biz);
    return call(fresh.sk);
  }
}
