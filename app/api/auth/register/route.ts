/**
 * `POST /api/auth/register` → `POST /v1/dashboard/auth/register`.
 *
 * Registration creates the business too, sandbox-active immediately with
 * `tier_1: false` — Test-env keys work at once, Live keys stay locked until an
 * admin approves KYB. So a successful register is a usable session and signs
 * the user straight in, exactly as login does.
 */

import { apiRequest, type TokenPair } from '@/app/lib/server/fluxelApi';
import {
  abandonSession,
  buildSession,
  errorResponse,
  readField,
  readJsonBody,
  validationError,
} from '@/app/lib/server/dashboardSession';
import { writeSession } from '@/app/lib/server/session';

/** Mirrors the API's own checks so the obvious mistakes never leave the browser. */
const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const email = readField(body, 'email').toLowerCase();
  const password = readField(body, 'password');
  const businessName = readField(body, 'business_name');
  const persist = (body as { remember?: unknown } | null)?.remember !== false;

  if (!email || !email.includes('@')) {
    return validationError('Enter a valid work email.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return validationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!businessName) {
    return validationError('Enter your registered business name.');
  }

  let tokens: TokenPair;
  try {
    tokens = await apiRequest<TokenPair>('/v1/dashboard/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, business_name: businessName }),
    });
  } catch (error) {
    return errorResponse(error);
  }

  await writeSession({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    email,
    persist,
  });

  try {
    return Response.json(await buildSession(tokens.access_token, email));
  } catch (error) {
    return abandonSession(error);
  }
}
