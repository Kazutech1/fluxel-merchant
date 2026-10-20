'use client';

import React from 'react';
import { SearchX, TriangleAlert } from 'lucide-react';
import { isCryptoAsset } from '../../lib/paymentSessions';
import { useLiveSession } from '../../lib/liveCheckout';
import type { CheckoutContext } from '../../lib/checkoutContext';
import CheckoutShell from '../../components/checkout/CheckoutShell';
import BankTransferPanel from '../../components/checkout/BankTransferPanel';
import CryptoPanel from '../../components/checkout/CryptoPanel';
import ResultPanel from '../../components/checkout/ResultPanel';

const noop = () => {};

/** Same card as the checkout, for the moments before there's a payment to show. */
export function CheckoutCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-slate-100 dark:bg-[#09090a] text-slate-900 dark:text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[460px] rounded-2xl bg-white dark:bg-[#131316] ring-1 ring-slate-200/70 dark:ring-[#222226] shadow-[0_12px_40px_-12px_rgb(15_23_42/0.18)] dark:shadow-none p-6 sm:p-7">
        {children}
      </div>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <CheckoutCard>
      <div className="animate-pulse" aria-label="Loading payment">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-slate-200 dark:bg-[#1e1e22]" />
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-[#1e1e22]" />
        </div>
        <div className="mt-6 h-10 w-48 rounded bg-slate-200 dark:bg-[#1e1e22]" />
        <div className="mt-6 h-6 rounded bg-slate-200 dark:bg-[#1e1e22]" />
        <div className="mt-6 h-40 rounded-xl bg-slate-200 dark:bg-[#1e1e22]" />
      </div>
    </CheckoutCard>
  );
}

export default function LiveCheckout({ reference, context }: { reference: string; context: CheckoutContext }) {
  const state = useLiveSession(reference, context);

  if (state.kind === 'loading') return <CheckoutSkeleton />;

  if (state.kind === 'error') {
    const notFound = state.status === 404;
    return (
      <CheckoutCard>
        <span className="size-11 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#1a1a1f] text-slate-500 dark:text-slate-400">
          {notFound ? <SearchX className="size-5" /> : <TriangleAlert className="size-5" />}
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">{notFound ? 'Payment request not found' : 'We couldn’t load this payment'}</h1>
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
            className="mt-6 w-full h-12 rounded-xl border border-slate-300 dark:border-[#2a2a30] text-sm font-medium flex items-center justify-center"
          >
            Back to {context.merchant ?? 'the merchant'}
          </a>
        )}
      </CheckoutCard>
    );
  }

  const { session } = state;
  const settled = session.status === 'completed' || session.status === 'underpaid' || session.status === 'expired';

  return (
    <CheckoutShell session={session}>
      {settled ? (
        <ResultPanel session={session} />
      ) : isCryptoAsset(session.asset_code) ? (
        <CryptoPanel session={session} onRequestAddress={noop} />
      ) : (
        <BankTransferPanel session={session} onRequestAccount={noop} onSent={state.refresh} onExpire={state.refresh} />
      )}
    </CheckoutShell>
  );
}
