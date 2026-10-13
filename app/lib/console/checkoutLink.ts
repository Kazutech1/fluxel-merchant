'use client';

import type { CheckoutContext } from '../checkoutContext';

/**
 * A hosted-checkout link for a deposit intent, in the format `/pay/[reference]`
 * reads (`lib/checkoutContext.ts`): the intent id in the path, and the
 * merchant's publishable key plus display details base64url-encoded in `?c=`.
 * Money and status always come from the API, never from the link.
 */
export function checkoutUrl(intentId: string, context: CheckoutContext): string {
  const json = JSON.stringify(context);
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/pay/${encodeURIComponent(intentId)}?c=${b64}`;
}
