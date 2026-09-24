/**
 * Browser-side calls for KYB submission and API key creation.
 * Both go through route handlers that hold the dashboard session cookies.
 */

import type {
  ApiKeySummary,
  CreatedApiKey,
  KeyClass,
  KeyEnv,
  KybDetails,
  KybSubmitResult,
} from '@/app/types/business';

export class BusinessRequestError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'BusinessRequestError';
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new BusinessRequestError(
      'provider_unavailable',
      'Could not reach the server. Check your connection and try again.'
    );
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = body as { error?: { code?: string; message?: string } } | null;
    throw new BusinessRequestError(
      envelope?.error?.code ?? 'internal_error',
      envelope?.error?.message ?? 'Something went wrong. Try again.'
    );
  }

  return body as T;
}

export function submitKyb(details: KybDetails): Promise<KybSubmitResult> {
  return call<KybSubmitResult>('/api/business/kyb', {
    method: 'POST',
    body: JSON.stringify({ details }),
  });
}

export function createApiKey(keyClass: KeyClass, env: KeyEnv): Promise<CreatedApiKey> {
  return call<CreatedApiKey>('/api/api-keys', {
    method: 'POST',
    body: JSON.stringify({ key_class: keyClass, env }),
  });
}

export function fetchApiKeys(): Promise<ApiKeySummary[]> {
  return call<ApiKeySummary[]>('/api/api-keys');
}

export function revokeApiKey(id: string): Promise<void> {
  return call<void>(`/api/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
