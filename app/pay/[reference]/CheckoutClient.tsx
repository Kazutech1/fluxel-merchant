'use client';

import React from 'react';
import { SearchX } from 'lucide-react';
import {
  CheckoutStatus,
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

interface CheckoutClientProps {
  reference: string;
}

const HEADINGS: Record<CheckoutStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  confirming: 'Confirming payment',
  completed: 'Payment complete',
  underpaid: 'Payment on hold',
  expired: 'Request expired',
};

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-white dark:bg-[#0d0d0d] text-slate-900 dark:text-slate-100 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

export default function CheckoutClient({ reference }: CheckoutClientProps) {
  const session = usePaymentSession(reference);

  // The store reads from localStorage, which isn't available during SSR or the
  // hydration render — without this guard the page flashes "not found" first.
  const hydrated = useIsHydrated();
  const demoEnabled = useDemoEnabled();

  useDemoDriver(session, hydrated && demoEnabled);

  if (!hydrated) {
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

  if (!session) {
    return (
      <Centered>
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
      </Centered>
    );
  }

  const settled =
    session.status === 'completed' ||
    session.status === 'underpaid' ||
    session.status === 'expired';

  return (
    <>
      <CheckoutShell session={session}>
        <h1 className="text-[1.75rem] sm:text-[2rem] leading-none font-semibold tracking-tight">
          {HEADINGS[session.status]}
        </h1>

        <div className="mt-7">
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
