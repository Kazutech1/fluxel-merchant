'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Clock3, TriangleAlert } from 'lucide-react';
import { PaymentSession, RAILS, formatQuote } from '../../lib/paymentSessions';
import { AssetCode } from '../../types/dashboard';
import { getAssetSymbol } from '../common/MinorUnitFormatter';
import CopyField from './CopyField';

interface ResultPanelProps {
  session: PaymentSession;
  onRestart: () => void;
}

/** How long the payer gets to read the receipt before being sent back. */
const REDIRECT_MS = 5_000;

function money(amount: string, asset: AssetCode): string {
  const symbol = asset === 'NGN' ? getAssetSymbol(asset) : '';
  const suffix = asset === 'NGN' ? '' : ` ${asset}`;
  return `${symbol}${formatQuote(amount, asset)}${suffix}`;
}

function subtract(a: string, b: string): string {
  try {
    const diff = BigInt(a) - BigInt(b);
    return (diff < BigInt(0) ? BigInt(0) : diff).toString();
  } catch {
    return '0';
  }
}

export default function ResultPanel({ session, onRestart }: ResultPanelProps) {
  const rail = RAILS[session.asset_code];
  const paidAsset = session.asset_code;

  const router = useRouter();
  const returnUrl = session.return_url || '/';

  // Derived from completed_at rather than held in state, so the countdown
  // survives a re-render and needs no setState inside an effect body.
  const deadline = session.completed_at
    ? new Date(session.completed_at).getTime() + REDIRECT_MS
    : null;
  const [now, setNow] = useState(() => Date.now());

  const leave = React.useCallback(() => {
    if (/^https?:\/\//i.test(returnUrl)) window.location.assign(returnUrl);
    else router.push(returnUrl);
  }, [returnUrl, router]);

  useEffect(() => {
    if (session.status !== 'completed' || !deadline) return;
    // Revisiting an old receipt link shouldn't bounce the payer instantly.
    if (Date.now() >= deadline) return;

    const timer = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (tick >= deadline) {
        clearInterval(timer);
        leave();
      }
    }, 250);

    return () => clearInterval(timer);
  }, [session.status, deadline, leave]);

  const secondsLeft = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;

  /* ------------------------------- expired ------------------------------- */
  if (session.status === 'expired') {
    return (
      <div>
        <span className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#1a1a1f] text-slate-500 dark:text-slate-400">
          <Clock3 className="w-5 h-5" />
        </span>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">This request expired</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          The account was only valid for 30 minutes. Nothing was charged — start again to get a
          fresh one.
        </p>

        <button
          type="button"
          onClick={onRestart}
          className="mt-6 w-full sm:w-auto sm:px-6 h-12 rounded-lg bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-[#ffe23d] active:scale-[0.99] transition cursor-pointer"
        >
          Start a new payment
        </button>
      </div>
    );
  }

  /* ------------------------------ underpaid ------------------------------ */
  if (session.status === 'underpaid') {
    const received = session.received_amount ?? '0';
    const shortfall = subtract(session.expected_amount, received);

    return (
      <div>
        <span className="w-11 h-11 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <TriangleAlert className="w-5 h-5" />
        </span>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">Short payment received</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          We received less than the amount due, so this payment is on hold.
        </p>

        <div className="mt-5 rounded-xl border border-slate-200 dark:border-[#1e1e22] px-4 divide-y divide-slate-200 dark:divide-[#1e1e22]">
          <div className="flex items-center justify-between gap-3 py-3 min-h-12">
            <span className="text-xs text-slate-500 dark:text-slate-400">Amount due</span>
            <span className="text-sm font-mono tabular-nums">
              {money(session.expected_amount, session.asset_code)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 py-3 min-h-12">
            <span className="text-xs text-slate-500 dark:text-slate-400">Received</span>
            <span className="text-sm font-mono tabular-nums">{money(received, paidAsset)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-3 min-h-12">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Short by</span>
            <span className="text-sm font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-400">
              {money(shortfall, session.asset_code)}
            </span>
          </div>
          <CopyField label="Reference" value={session.correlation_id} />
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {session.merchant_name} will either credit what you sent, ask for the balance, or refund
          you in full. Keep the reference above if you need to follow up.
        </p>
      </div>
    );
  }

  /* ------------------------------ completed ------------------------------ */
  const received = session.received_amount ?? session.expected_amount;

  return (
    <div>
      <span className="w-11 h-11 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <Check className="w-5 h-5" strokeWidth={2.5} />
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-tight">Payment complete</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        {money(received, paidAsset)} received. {session.merchant_name} has been notified.
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 dark:border-[#1e1e22] px-4 divide-y divide-slate-200 dark:divide-[#1e1e22]">
        <div className="flex items-center justify-between gap-3 py-3 min-h-12">
          <span className="text-xs text-slate-500 dark:text-slate-400">Paid with</span>
          <span className="text-sm text-right">{`${rail.label} · ${rail.network}`}</span>
        </div>
        <CopyField label="Order" value={session.order_ref} />
        <CopyField label="Reference" value={session.correlation_id} />
      </div>

      <button
        type="button"
        onClick={leave}
        className="mt-5 w-full h-12 rounded-lg bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-[#ffe23d] active:scale-[0.99] transition inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        Return to {session.merchant_name}
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 text-center">
        {secondsLeft > 0
          ? `Taking you back in ${secondsLeft}s…`
          : `A receipt has been sent to ${session.customer_name}.`}
      </p>
    </div>
  );
}
