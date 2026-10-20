'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Clock3, TriangleAlert } from 'lucide-react';
import { PaymentSession, RAILS } from '../../lib/paymentSessions';
import CopyField from './CopyField';
import { checkoutMoney } from './money';

interface ResultPanelProps {
  session: PaymentSession;
  /** Demo only. Without it, an expired request offers the way back to the merchant. */
  onRestart?: () => void;
}

/** How long the payer gets to read the receipt before being sent back. */
const REDIRECT_MS = 5_000;

const PRIMARY =
  'w-full h-12 rounded-xl bg-[#fed700] text-[#0a0a0b] text-sm font-semibold shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)] hover:bg-[#ffe23d] active:scale-[0.99] transition inline-flex items-center justify-center gap-2 cursor-pointer';

function subtract(a: string, b: string): string {
  try {
    const diff = BigInt(a) - BigInt(b);
    return (diff < BigInt(0) ? BigInt(0) : diff).toString();
  } catch {
    return '0';
  }
}

function Receipt({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-7 rounded-2xl border border-slate-200 dark:border-[#26262b] px-5 divide-y divide-slate-200 dark:divide-[#26262b] text-left">
      {children}
    </div>
  );
}

function Line({ label, children, tone }: { label: string; children: React.ReactNode; tone?: 'warn' }) {
  const warn = tone === 'warn';
  return (
    <div className="flex items-center justify-between gap-3 py-3 min-h-12">
      <span className={`text-xs ${warn ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
      <span className={`text-sm text-right tabular-nums ${warn ? 'font-semibold text-amber-700 dark:text-amber-400' : ''}`}>{children}</span>
    </div>
  );
}

export default function ResultPanel({ session, onRestart }: ResultPanelProps) {
  const rail = RAILS[session.asset_code];
  const money = (amount: string) => checkoutMoney(amount, session.asset_code);

  const router = useRouter();
  const returnUrl = session.return_url || '/';

  // Derived from completed_at rather than held in state, so the countdown
  // survives a re-render and needs no setState inside an effect body.
  const deadline = session.completed_at ? new Date(session.completed_at).getTime() + REDIRECT_MS : null;
  const [now, setNow] = useState(() => Date.now());

  const leave = React.useCallback(() => {
    if (/^https?:\/\//i.test(returnUrl)) window.location.assign(returnUrl);
    else router.push(returnUrl);
  }, [returnUrl, router]);

  useEffect(() => {
    if (session.status !== 'completed' || !deadline || !session.return_url) return;
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
  }, [session.status, session.return_url, deadline, leave]);

  const secondsLeft = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;

  /* ------------------------------- expired ------------------------------- */
  if (session.status === 'expired') {
    return (
      <div className="text-center">
        <span className="mx-auto size-16 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#1a1a1f] text-slate-500 dark:text-slate-400">
          <Clock3 className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">This payment expired</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
          {onRestart
            ? 'The account was only valid for 30 minutes. Nothing was charged — start again to get a fresh one.'
            : `Nothing arrived before the time ran out, and nothing was charged. Ask ${session.merchant_name} for a new link.`}
        </p>
        {(onRestart || session.return_url) && (
          <button type="button" onClick={onRestart ?? leave} className={`mt-7 ${PRIMARY}`}>
            {onRestart ? 'Start a new payment' : `Back to ${session.merchant_name}`}
          </button>
        )}
      </div>
    );
  }

  /* ------------------------------ underpaid ------------------------------ */
  if (session.status === 'underpaid') {
    const received = session.received_amount ?? '0';
    return (
      <div className="text-center">
        <span className="mx-auto size-16 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <TriangleAlert className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Part payment received</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
          We got less than the amount due, so this payment is on hold.
        </p>
        <Receipt>
          <Line label="Amount due">{money(session.expected_amount)}</Line>
          <Line label="Received">{money(received)}</Line>
          <Line label="Short by" tone="warn">
            {money(subtract(session.expected_amount, received))}
          </Line>
          <CopyField label="Reference" value={session.correlation_id} />
        </Receipt>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {session.merchant_name} will either accept what you sent, ask for the rest, or refund you. Keep the reference to follow up.
        </p>
      </div>
    );
  }

  /* ------------------------------ completed ------------------------------ */
  const received = session.received_amount && session.received_amount !== '0' ? session.received_amount : session.expected_amount;

  return (
    <div className="text-center">
      <span className="relative mx-auto size-16 flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping [animation-iteration-count:2]" />
        <span className="relative size-16 rounded-full bg-emerald-500 text-white flex items-center justify-center">
          <Check className="size-8" strokeWidth={3} />
        </span>
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Payment successful</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {money(received)} paid to {session.merchant_name}.
      </p>

      <Receipt>
        <Line label="Paid with">{`${rail.label} · ${session.bank_name ?? rail.network}`}</Line>
        <CopyField label="Order" value={session.order_ref} />
        <CopyField label="Reference" value={session.correlation_id} />
      </Receipt>

      {session.return_url && (
        <>
          <button type="button" onClick={leave} className={`mt-6 ${PRIMARY}`}>
            Back to {session.merchant_name}
            <ArrowRight className="size-4" />
          </button>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            {secondsLeft > 0 ? `Taking you back in ${secondsLeft}s…` : 'You can close this page.'}
          </p>
        </>
      )}
      {!session.return_url && <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">You can close this page.</p>}
    </div>
  );
}
