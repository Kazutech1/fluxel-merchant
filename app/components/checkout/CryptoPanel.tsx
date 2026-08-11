'use client';

import React from 'react';
import { CircleCheck, Coins, QrCode as QrCodeIcon, TriangleAlert, Wallet } from 'lucide-react';
import {
  CRYPTO_METHODS,
  CryptoMethod,
  DEPOSIT_ADDRESSES,
  PaymentSession,
  RAILS,
  convertFromNgn,
  formatQuote,
} from '../../lib/paymentSessions';
import DetailField from './DetailField';
import QrCode from './QrCode';
import RailIcon from './RailIcon';
import Step from './Step';

interface CryptoPanelProps {
  session: PaymentSession;
  method: CryptoMethod;
  onSelectAsset: (method: CryptoMethod) => void;
}

const ICON = 'w-3.5 h-3.5';

export default function CryptoPanel({ session, method, onSelectAsset }: CryptoPanelProps) {
  const rail = RAILS[method];
  const address = DEPOSIT_ADDRESSES[method];
  const amount = formatQuote(convertFromNgn(session.expected_amount, rail.asset), rail.asset);

  const confirming = session.status === 'confirming';
  const confirmations = session.confirmations ?? 0;
  const required = rail.confirmationsRequired;
  const progress = Math.min((confirmations / Math.max(required, 1)) * 100, 100);

  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">
        Send crypto and we&apos;ll credit the invoice
      </h2>

      <div className="mt-6">
        <Step icon={<Coins className="w-4 h-4" />} title="Choose the asset you want to pay with.">
          <div className="grid grid-cols-3 gap-2">
            {CRYPTO_METHODS.map((candidate) => {
              const option = RAILS[candidate];
              const active = candidate === method;
              return (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => onSelectAsset(candidate)}
                  aria-pressed={active}
                  className={`min-h-11 px-2 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    active
                      ? 'border-slate-900 dark:border-[#fed700] bg-slate-50 dark:bg-[#1a1a1f] text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-[#26262b] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-[#3a3a42]'
                  }`}
                >
                  <RailIcon asset={option.asset} className="w-5 h-5 text-[10px]" />
                  {option.asset}
                </button>
              );
            })}
          </div>
        </Step>

        <Step
          icon={<QrCodeIcon className="w-4 h-4" />}
          title={`Send exactly ${amount} ${rail.asset} on ${rail.network}.`}
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
                  {amount} {rail.asset}
                </span>
              }
              icon={<Wallet className={ICON} />}
              mono
            />
            <DetailField
              label={`${rail.asset} address (${rail.network})`}
              value={address}
              icon={<Coins className={ICON} />}
              mono
              wrap
            />
          </div>

          <div className="mt-3 flex gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3">
            <TriangleAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-px" />
            <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
              Send only {rail.asset} on {rail.network}. Funds sent on another network cannot be
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
              : `We'll credit the invoice after ${required} confirmations.`
          }
        >
          {confirming && (
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
          )}
        </Step>
      </div>
    </div>
  );
}
