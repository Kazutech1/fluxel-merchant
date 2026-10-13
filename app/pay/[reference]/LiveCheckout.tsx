'use client';

import React from 'react';
import { SearchX, TriangleAlert } from 'lucide-react';
import { CheckoutStatus, isCryptoAsset } from '../../lib/paymentSessions';
import { useLiveSession } from '../../lib/liveCheckout';
import type { CheckoutContext } from '../../lib/checkoutContext';
import CheckoutShell from '../../components/checkout/CheckoutShell';
import BankTransferPanel from '../../components/checkout/BankTransferPanel';
import CryptoPanel from '../../components/checkout/CryptoPanel';
import ResultPanel from '../../components/checkout/ResultPanel';

const HEADINGS: Record<CheckoutStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  confirming: 'Confirming payment',
  completed: 'Payment complete',
  underpaid: 'Payment on hold',
  expired: 'Request expired',
};

const noop = () => {};

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-white dark:bg-[#0d0d0d] text-slate-900 dark:text-slate-100 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

export default function LiveCheckout({ reference, context }: { reference: string; context: CheckoutContext }) {
  const state = useLiveSession(reference, context);

  if (state.kind === 'loading') {
    return (
      <Centered>
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-40 rounded bg-slate-200 dark:bg-[#1e1e22]" />
          <div className="h-px bg-slate-200 dark:bg-[#1e1e22]" />
          <div className="h-12 rounded-lg bg-slate-200 dark:bg-[#1e1e22]" />
          <div className="h-12 rounded-lg bg-slate-200 dark:bg-[#1e1e22]" />
        </div>
      </Centered>
    );
  }

  if (state.kind === 'error') {
    const notFound = state.status === 404;
    return (
      <Centered>
        <span className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#1a1a1f] text-slate-500 dark:text-slate-400">
          {notFound ? <SearchX className="w-5 h-5" /> : <TriangleAlert className="w-5 h-5" />}
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">
          {notFound ? 'Payment request not found' : 'We couldn’t load this payment'}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {notFound ? (
            <>
              <span className="font-mono break-all">{reference}</span> doesn&apos;t match a payment request.
            </>
          ) : (
            state.message
          )}
        </p>
        {context.return_url && (
          <a
            href={context.return_url}
            className="mt-6 w-full h-12 rounded-lg border border-slate-300 dark:border-[#2a2a30] text-sm font-medium flex items-center justify-center"
          >
            Back to {context.merchant ?? 'the merchant'}
          </a>
        )}
      </Centered>
    );
  }

  const session = state.session;
  const settled = session.status === 'completed' || session.status === 'underpaid' || session.status === 'expired';

  return (
    <CheckoutShell session={session}>
      <h1 className="text-[1.75rem] sm:text-[2rem] leading-none font-semibold tracking-tight">
        {HEADINGS[session.status]}
      </h1>
      <div className="mt-7">
        {settled ? (
          <ResultPanel session={session} />
        ) : isCryptoAsset(session.asset_code) ? (
          <CryptoPanel session={session} onRequestAddress={noop} />
        ) : (
          <BankTransferPanel session={session} onRequestAccount={noop} />
        )}
      </div>
    </CheckoutShell>
  );
}
