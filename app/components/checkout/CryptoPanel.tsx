'use client';

import React from 'react';
import { CircleCheck, Coins, QrCode as QrCodeIcon, TriangleAlert, Wallet } from 'lucide-react';
import { PaymentSession, RAILS, formatQuote } from '../../lib/paymentSessions';
import DetailField from './DetailField';
import QrCode from './QrCode';
import Step from './Step';
import WaitingIndicator from './WaitingIndicator';

interface CryptoPanelProps {
  session: PaymentSession;
  onRequestAddress: () => void;
}

const ICON = 'w-3.5 h-3.5';

export default function CryptoPanel({ session, onRequestAddress }: CryptoPanelProps) {
  const asset = session.asset_code;
  const rail = RAILS[asset];
  const address = session.deposit_address;
  const amount = formatQuote(session.expected_amount, asset);

  const confirming = session.status === 'confirming';
  const confirmations = session.confirmations ?? 0;
  const required = rail.confirmationsRequired;
  const progress = Math.min((confirmations / Math.max(required, 1)) * 100, 100);

  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">
        Pay with {asset} on {rail.network}
      </h2>

      <div className="mt-6">
        {!address ? (
          <>
            <Step
              icon={<QrCodeIcon className="w-4 h-4" />}
              title={`Get a ${asset} address for this payment.`}
            >
              <button
                type="button"
                onClick={onRequestAddress}
                className="w-full h-12 rounded-lg bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-[#ffe23d] active:scale-[0.99] transition cursor-pointer"
              >
                Show deposit address
              </button>
              <p className="mt-2.5 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                The address belongs to this invoice alone, so we can match your deposit without a
                memo or reference.
              </p>
            </Step>

            <Step
              last
              icon={<CircleCheck className="w-4 h-4" />}
              title={`We credit the invoice after ${required} confirmations on ${rail.network}.`}
            />
          </>
        ) : (
          <>
            <Step
              icon={<QrCodeIcon className="w-4 h-4" />}
              title={`Send exactly ${amount} ${asset} to the address below.`}
            >
              <div className="flex justify-center mb-3">
                <QrCode value={address} className="w-40 h-40" />
              </div>

              <div className="space-y-2">
                <DetailField
                  label="Amount"
                  value={amount.replace(/,/g, '')}
                  display={
                    <span className="font-semibold">
                      {amount} {asset}
                    </span>
                  }
                  icon={<Wallet className={ICON} />}
                  mono
                />
                <DetailField
                  label={`${asset} address (${rail.network})`}
                  value={address}
                  icon={<Coins className={ICON} />}
                  mono
                  wrap
                />
              </div>

              <div className="mt-3 flex gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3">
                <TriangleAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-px" />
                <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
                  Send only {asset} on {rail.network}. Funds sent on another network cannot be
                  recovered.
                </p>
              </div>
            </Step>

            <Step
              last
              icon={<CircleCheck className="w-4 h-4" />}
              title={
                confirming
                  ? `Confirming on ${rail.network}.`
                  : `We credit the invoice after ${required} confirmations.`
              }
            >
              {confirming ? (
                <div className="rounded-lg border border-slate-200 dark:border-[#26262b] px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Block depth
                    </span>
                    <span className="text-sm font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {confirmations}/{required}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 rounded-full bg-slate-200 dark:bg-[#1e1e22] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-900 dark:bg-[#fed700] transition-[width] duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Transaction seen on-chain. You can leave this page open.
                  </p>
                </div>
              ) : (
                <WaitingIndicator
                  label="Watching the chain"
                  sublabel="This page updates as soon as your deposit appears"
                />
              )}
            </Step>
          </>
        )}
      </div>
    </div>
  );
}
