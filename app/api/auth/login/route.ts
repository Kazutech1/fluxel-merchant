/** `POST /api/auth/login` → `POST /v1/dashboard/auth/login`, tokens into cookies. */

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

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  const email = readField(body, 'email').toLowerCase();
  const password = readField(body, 'password');
  // Absent means remember — only an explicit `false` opts out.
  const persist = (body as { remember?: unknown } | null)?.remember !== false;

  if (!email || !password) {
    return validationError('Enter your email and password to continue.');
  }

  let tokens: TokenPair;
  try {
    tokens = await apiRequest<TokenPair>('/v1/dashboard/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
    // Authenticated but unusable — a frozen or rejected business is refused by
    // `dashboard_auth_middleware`. Don't leave tokens behind for that.
    return abandonSession(error);
  }
}
