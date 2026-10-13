import type { Metadata } from 'next';
import CheckoutClient from './CheckoutClient';
import LiveCheckout from './LiveCheckout';
import { decodeCheckoutContext } from '../../lib/checkoutContext';

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

export default async function PayPage({ params, searchParams }: PayPageProps) {
  const { reference } = await params;
  const { c } = await searchParams;

  // A real intent id plus a merchant context → the live checkout. Anything
  // else falls through to the localStorage demo.
  const context = /^(cdi|fdi)_/.test(reference) ? decodeCheckoutContext(c) : null;
  if (context) return <LiveCheckout reference={reference} context={context} />;

  return <CheckoutClient reference={reference} />;
}
