/**
 * The session cookie jar.
 *
 * The Rust API hands back a bearer pair (`UserAuthServiceImpl`): a 15-minute
 * HS256 access JWT and a 30-day refresh token. Both are stored httpOnly so the
 * dashboard's own scripts can't read them — the route handlers in `app/api/`
 * are the only code that ever sees a token.
 *
 * `fluxel_em` carries the signed-in email because neither the JWT claims nor
 * any dashboard endpoint returns it, and the header has to render *something*
 * after a page reload. `fluxel_kp` records whether "keep me signed in" was
 * ticked, because a cookie's own persistence can't be read back — without it a
 * token rotation would silently upgrade a browser-session login to a 30-day one.
 */

import { cookies } from 'next/headers';

import { IS_PRODUCTION } from './config';

const ACCESS_COOKIE = 'fluxel_at';
const REFRESH_COOKIE = 'fluxel_rt';
const EMAIL_COOKIE = 'fluxel_em';
const PERSIST_COOKIE = 'fluxel_kp';

/** Matches `UserAuthServiceImpl::access_ttl` (15 minutes). */
const ACCESS_MAX_AGE = 15 * 60;
/** Matches `UserAuthServiceImpl::refresh_ttl` (30 days). */
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

const BASE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: IS_PRODUCTION,
  path: '/',
} as const;

export interface StoredSession {
  accessToken?: string;
  refreshToken?: string;
  email?: string;
  /** Whether the login asked to be remembered across browser restarts. */
  persist: boolean;
}

export async function readSession(): Promise<StoredSession> {
  const jar = await cookies();
  return {
    accessToken: jar.get(ACCESS_COOKIE)?.value,
    refreshToken: jar.get(REFRESH_COOKIE)?.value,
    email: jar.get(EMAIL_COOKIE)?.value,
    persist: jar.get(PERSIST_COOKIE)?.value === '1',
  };
}

/**
 * Writes a fresh token pair. `persist: false` omits `maxAge` on every cookie,
 * making them browser-session cookies that die when the window closes — the
 * refresh token then outlives nothing, which is the point of the checkbox.
 */
export async function writeSession(input: {
  accessToken: string;
  refreshToken: string;
  email: string;
  persist: boolean;
}): Promise<void> {
  const jar = await cookies();
  const { persist } = input;

  jar.set(ACCESS_COOKIE, input.accessToken, {
    ...BASE,
    ...(persist ? { maxAge: ACCESS_MAX_AGE } : {}),
  });
  jar.set(REFRESH_COOKIE, input.refreshToken, {
    ...BASE,
    ...(persist ? { maxAge: REFRESH_MAX_AGE } : {}),
  });
  jar.set(EMAIL_COOKIE, input.email, {
    ...BASE,
    ...(persist ? { maxAge: REFRESH_MAX_AGE } : {}),
  });
  jar.set(PERSIST_COOKIE, persist ? '1' : '0', {
    ...BASE,
    ...(persist ? { maxAge: REFRESH_MAX_AGE } : {}),
  });
}

/** Replaces just the token pair after a rotation, keeping email and persistence. */
export async function writeRotatedTokens(accessToken: string, refreshToken: string): Promise<void> {
  const current = await readSession();
  await writeSession({
    accessToken,
    refreshToken,
    email: current.email ?? '',
    persist: current.persist,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, EMAIL_COOKIE, PERSIST_COOKIE]) {
    jar.delete(name);
  }
}
