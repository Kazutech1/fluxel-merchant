/** Browser-side customer reads. Goes through the route handler holding the session. */

import type { DashboardCustomer } from '@/app/types/customers';

export class CustomerRequestError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'CustomerRequestError';
  }
}

export async function fetchCustomers(): Promise<DashboardCustomer[]> {
  let response: Response;
  try {
    response = await fetch('/api/customers');
  } catch {
    throw new CustomerRequestError(
      'provider_unavailable',
      'Could not reach the server. Check your connection and try again.'
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = body as { error?: { code?: string; message?: string } } | null;
    throw new CustomerRequestError(
      envelope?.error?.code ?? 'internal_error',
      envelope?.error?.message ?? 'Could not load customers.'
    );
  }

  return body as DashboardCustomer[];
}
