'use client';

import React from 'react';
import { SearchX } from 'lucide-react';
import {
  createDemoSession,
  isCryptoAsset,
  usePaymentSession,
} from '../../lib/paymentSessions';
import {
  markCompleted,
  markExpired,
  requestDepositAddress,
  requestVirtualAccount,
  restartSession,
  useDemoDriver,
} from '../../lib/checkoutDemo';
import { useDemoEnabled, useIsHydrated } from '../../lib/clientEnv';
import CheckoutShell from '../../components/checkout/CheckoutShell';
import BankTransferPanel from '../../components/checkout/BankTransferPanel';
import CryptoPanel from '../../components/checkout/CryptoPanel';
import ResultPanel from '../../components/checkout/ResultPanel';
import DemoControls from '../../components/checkout/DemoControls';
import { CheckoutCard, CheckoutSkeleton } from './LiveCheckout';

interface CheckoutClientProps {
  reference: string;
  /** Crypto switched off platform-wide: a crypto demo session reads as not found. */
  cryptoDisabled: boolean;
}

export default function CheckoutClient({ reference, cryptoDisabled }: CheckoutClientProps) {
  const stored = usePaymentSession(reference);
  const session = stored && cryptoDisabled && isCryptoAsset(stored.asset_code) ? undefined : stored;

  // The store reads from localStorage, which isn't available during SSR or the
  // hydration render — without this guard the page flashes "not found" first.
  const hydrated = useIsHydrated();
  const demoEnabled = useDemoEnabled();

  useDemoDriver(session, hydrated && demoEnabled);

  if (!hydrated) return <CheckoutSkeleton />;

  if (!session) {
    return (
      <CheckoutCard>
        <span className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#1a1a1f] text-slate-500 dark:text-slate-400">
          <SearchX className="w-5 h-5" />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Payment request not found</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          <span className="font-mono break-all">{reference}</span> doesn&apos;t match an active
          request. It may have been completed already, or the link was mistyped.
        </p>

        {demoEnabled && (
          <button
            type="button"
            onClick={() => createDemoSession(reference)}
            className="mt-6 w-full h-12 rounded-lg border border-dashed border-slate-400 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#141416] transition-colors cursor-pointer"
          >
            Create a demo request at this link
          </button>
        )}
      </CheckoutCard>
    );
  }

  const settled =
    session.status === 'completed' ||
    session.status === 'underpaid' ||
    session.status === 'expired';

  return (
    <>
      <CheckoutShell session={session}>
        <div>
          {settled ? (
            <ResultPanel session={session} onRestart={() => restartSession(session)} />
          ) : isCryptoAsset(session.asset_code) ? (
            <CryptoPanel
              session={session}
              onRequestAddress={() => requestDepositAddress(session)}
            />
          ) : (
            <BankTransferPanel
              session={session}
              onRequestAccount={() => requestVirtualAccount(session)}
              onConfirmPaid={() => markCompleted(session)}
              onExpire={() => markExpired(session)}
            />
          )}
        </div>
      </CheckoutShell>

      {demoEnabled && <DemoControls session={session} />}
    </>
  );
}
