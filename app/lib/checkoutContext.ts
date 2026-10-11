import type { LineItem } from './paymentSessions';

/**
 * The `?c=` parameter on a live checkout link (`/pay/{intent_id}?c=...`):
 * base64url-encoded JSON from the merchant. It carries the merchant's
 * publishable key plus display-only details the API doesn't store yet. Money
 * and status always come from the API, never from here.
 */
export interface CheckoutContext {
  pk: string;
  merchant?: string;
  order_ref?: string;
  customer_name?: string;
  items?: LineItem[];
  return_url?: string;
}

/** Returns null for anything malformed or not carrying a pk_ key. */
export function decodeCheckoutContext(raw: string | undefined): CheckoutContext | null {
  if (!raw) return null;
  try {
    const ctx = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as CheckoutContext;
    if (typeof ctx.pk !== 'string' || !ctx.pk.startsWith('pk_')) return null;
    // Only http(s) return URLs — never javascript: or similar.
    if (ctx.return_url && !/^https?:\/\//i.test(ctx.return_url)) delete ctx.return_url;
    return ctx;
  } catch {
    return null;
  }
}
