import type { Metadata } from 'next';
import CheckoutClient from './CheckoutClient';

/**
 * Next 16: `params` is a Promise and must be awaited. See
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md
 */
interface PayPageProps {
  params: Promise<{ reference: string }>;
}

export const metadata: Metadata = {
  title: 'Complete your payment · Fluxel',
  description: 'Secure payment page powered by Fluxel.',
};

export default async function PayPage({ params }: PayPageProps) {
  const { reference } = await params;
  return <CheckoutClient reference={reference} />;
}
