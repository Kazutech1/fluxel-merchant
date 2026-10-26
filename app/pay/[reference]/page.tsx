import type { Metadata, Viewport } from 'next';
import CheckoutClient from './CheckoutClient';
import LiveCheckout from './LiveCheckout';
import { decodeCheckoutContext } from '../../lib/checkoutContext';
import { isCryptoDisabled } from '../../lib/server/features';

/**
 * Next 16: `params` and `searchParams` are Promises and must be awaited. See
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md
 */
interface PayPageProps {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ c?: string }>;
}

export const metadata: Metadata = {
  title: 'Complete your payment',
  description: 'Secure payment page powered by Fluxel.',
};

/** Checkout is always light (see THEME_BOOTSTRAP in app/layout.tsx), so the browser chrome is too. */
export const viewport: Viewport = {
  themeColor: '#f1f5f9',
  colorScheme: 'light',
};

export default async function PayPage({ params, searchParams }: PayPageProps) {
  const { reference } = await params;
  const { c } = await searchParams;
  const cryptoDisabled = await isCryptoDisabled();

  // A real intent id plus a merchant context → the live checkout. Anything
  // else falls through to the localStorage demo.
  const context = /^(cdi|fdi)_/.test(reference) ? decodeCheckoutContext(c) : null;
  if (context) return <LiveCheckout reference={reference} context={context} />;

  return <CheckoutClient reference={reference} cryptoDisabled={cryptoDisabled} />;
}
