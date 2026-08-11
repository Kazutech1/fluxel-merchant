'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Link2, X } from 'lucide-react';
import { PaymentSession } from '../../lib/paymentSessions';
import { useOrigin } from '../../lib/clientEnv';
import { formatMinorUnits, getAssetSymbol } from './MinorUnitFormatter';
import QrCode from '../checkout/QrCode';

interface PaymentLinkModalProps {
  session: PaymentSession | null;
  onClose: () => void;
}

export default function PaymentLinkModal({ session, onClose }: PaymentLinkModalProps) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!session) return null;

  const url = `${origin}/pay/${session.reference}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* clipboard blocked — the link is selectable as a fallback */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#141416] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm max-h-[90svh] overflow-y-auto p-5 sm:p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-amber-500/10 text-slate-700 dark:text-[#fed700] flex items-center justify-center shrink-0">
            <Link2 className="w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Payment request ready
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {getAssetSymbol(session.asset_code)}
              {formatMinorUnits(session.expected_amount, session.asset_code)} · {session.customer_name}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <QrCode value={url} className="w-40 h-40" />
        </div>

        <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
          Scan to open the checkout on a phone
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1c1c20] pl-3 pr-1 py-1">
          <span className="flex-1 min-w-0 font-mono text-xs text-slate-700 dark:text-slate-300 truncate select-all">
            {url || '…'}
          </span>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 min-h-11 px-3 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2a2a30] transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c1c20] transition-colors cursor-pointer"
          >
            Done
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="h-11 rounded-lg bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-[#ffe23d] transition-colors inline-flex items-center justify-center gap-1.5"
          >
            Open
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
          <span className="font-mono">{session.reference}</span> · the link stays valid; the account
          expires 30 minutes after your customer asks for it.
        </p>
      </div>
    </div>
  );
}
