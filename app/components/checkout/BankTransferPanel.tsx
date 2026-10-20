"use client";

import React, { useState } from "react";
import { Landmark, Loader2 } from "lucide-react";
import { PaymentSession, formatQuote } from "../../lib/paymentSessions";
import CopyButton from "./CopyButton";
import ExpiryBar from "./ExpiryBar";
import { checkoutMoney } from "./money";

interface BankTransferPanelProps {
  session: PaymentSession;
  onRequestAccount: () => void;
  /** Demo only — marks the request paid. */
  onConfirmPaid?: () => void;
  /** Live: the payer says they've sent it — check right away. */
  onSent?: () => void;
  onExpire?: () => void;
}


const PRIMARY =
  "w-full h-12 rounded-xl bg-[#fed700] text-[#0a0a0b] text-sm font-semibold shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)] hover:bg-[#ffe23d] active:scale-[0.99] transition cursor-pointer";

/** Paystack-style "pay with transfer": the account front and centre, then "I've sent the money". */
export default function BankTransferPanel({ session, onRequestAccount, onConfirmPaid, onSent, onExpire }: BankTransferPanelProps) {
  const [sent, setSent] = useState(false);
  const amount = checkoutMoney(session.expected_amount, session.asset_code);
  const issued = Boolean(session.account_number);

  if (!issued) {
    return session.live ? (
      <div role="status" className="py-10 text-center">
        <span className="mx-auto size-12 rounded-full bg-slate-100 dark:bg-[#1a1a1f] inline-flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-slate-500" />
        </span>
        <p className="mt-4 text-base font-semibold">Getting your account ready</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A one-time account for this payment — just a few seconds.</p>
      </div>
    ) : (
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pay with bank transfer</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          You&apos;ll get an account number that&apos;s yours alone for 30 minutes, so only ask for it when you&apos;re ready to send.
        </p>
        <button type="button" onClick={onRequestAccount} className={`mt-6 ${PRIMARY}`}>
          Show account details
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <div role="status" className="py-6 text-center">
        <span className="relative mx-auto size-16 inline-flex items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-[#26262b]" />
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#dfa90a] animate-spin" />
          <Landmark className="size-6 text-slate-700 dark:text-slate-200" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Confirming your transfer</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
          This usually takes under a minute. Keep this page open — it moves on by itself as soon as {amount} lands.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 text-sm font-medium text-slate-600 dark:text-slate-300 underline underline-offset-4 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          Show account details again
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">Transfer</p>
      <h1 className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{amount}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">to the account below, in one transfer.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 dark:border-[#26262b] overflow-hidden">
        <div className="px-5 py-5 bg-slate-50 dark:bg-[#141417]">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Landmark className="size-4" />
            {session.bank_name}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="font-mono text-[1.75rem] sm:text-[2rem] leading-none font-semibold tracking-[0.06em] tabular-nums select-all">
              {session.account_number}
            </span>
            <CopyButton value={session.account_number ?? ""} label="account number" />
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 truncate">{session.account_name}</p>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 dark:border-[#26262b]">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Exact amount</p>
            <p className="text-sm font-semibold tabular-nums">{amount}</p>
          </div>
          <CopyButton value={formatQuote(session.expected_amount, session.asset_code).replace(/,/g, "")} label="amount" />
        </div>
      </div>

      {session.expires_at && (
        <div className="mt-5">
          <ExpiryBar expiresAt={session.expires_at} onExpire={onExpire} />
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (onConfirmPaid) return onConfirmPaid();
          setSent(true);
          onSent?.();
        }}
        className={`mt-6 ${PRIMARY}`}
      >
        I&apos;ve sent the money
      </button>
      <p className="mt-3 text-xs text-center text-slate-500 dark:text-slate-400">
        Send the exact amount — more or less can delay your payment.
      </p>
    </div>
  );
}
