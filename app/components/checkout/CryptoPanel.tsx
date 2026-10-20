"use client";

import React from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { PaymentSession, RAILS, formatQuote } from "../../lib/paymentSessions";
import CopyButton from "./CopyButton";
import ExpiryBar from "./ExpiryBar";
import QrCode from "./QrCode";

interface CryptoPanelProps {
  session: PaymentSession;
  onRequestAddress: () => void;
}


export default function CryptoPanel({ session, onRequestAddress }: CryptoPanelProps) {
  const asset = session.asset_code;
  const rail = RAILS[asset];
  const address = session.deposit_address;
  const amount = formatQuote(session.expected_amount, asset);

  if (!address) {
    return session.live ? (
      <div role="status" className="py-10 text-center">
        <span className="mx-auto size-12 rounded-full bg-slate-100 dark:bg-[#1a1a1f] inline-flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-slate-500" />
        </span>
        <p className="mt-4 text-base font-semibold">Generating your {asset} address</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A one-time address for this payment — just a few seconds.</p>
      </div>
    ) : (
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Pay with {asset} on {rail.network}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          The address belongs to this payment alone, so we can match your deposit without a memo.
        </p>
        <button
          type="button"
          onClick={onRequestAddress}
          className="mt-6 w-full h-12 rounded-xl bg-[#fed700] text-[#0a0a0b] text-sm font-semibold shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)] hover:bg-[#ffe23d] active:scale-[0.99] transition cursor-pointer"
        >
          Show deposit address
        </button>
      </div>
    );
  }

  // On-chain confirmations are our business, not the payer's: once the
  // deposit is seen, just say it's in and let the page move on when it's final.
  if (session.status === "confirming") {
    return (
      <div role="status" className="py-6 text-center">
        <span className="relative mx-auto size-16 inline-flex items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-[#26262b]" />
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#dfa90a] animate-spin" />
          <Check className="size-6 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Payment received</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
          We&apos;re finishing up. You can close this page — the payment completes either way.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">Send</p>
      <h1 className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
        {amount} {asset}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">on {rail.network}, to the address below.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 dark:border-[#26262b] overflow-hidden">
        <div className="flex justify-center px-5 pt-5 pb-4 bg-slate-50 dark:bg-[#141417]">
          <QrCode value={address} className="size-44 ring-1 ring-slate-200 dark:ring-0" />
        </div>
        <div className="px-5 py-4 border-t border-slate-200 dark:border-[#26262b]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">{asset} address</p>
            <CopyButton value={address} label="address" />
          </div>
          <p className="mt-1.5 font-mono text-[13px] leading-relaxed break-all select-all">{address}</p>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 dark:border-[#26262b]">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Exact amount</p>
            <p className="font-mono text-sm font-semibold tabular-nums">
              {amount} {asset}
            </p>
          </div>
          <CopyButton value={amount.replace(/,/g, "")} label="amount" />
        </div>
      </div>

      <div className="mt-4 flex gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
        <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-px" />
        <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
          Send only {asset} on {rail.network}. Anything sent on another network can&apos;t be recovered.
        </p>
      </div>

      {session.expires_at && (
        <div className="mt-5">
          <ExpiryBar expiresAt={session.expires_at} />
        </div>
      )}
    </div>
  );
}
