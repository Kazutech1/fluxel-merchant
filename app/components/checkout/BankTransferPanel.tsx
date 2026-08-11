'use client';

import React from 'react';
import { BadgeCheck, Banknote, Building2, CircleCheck, Hash, Wallet } from 'lucide-react';
import { PaymentSession, formatQuote } from '../../lib/paymentSessions';
import { getAssetSymbol } from '../common/MinorUnitFormatter';
import Countdown from './Countdown';
import DetailField from './DetailField';
import Step from './Step';
import WaitingIndicator from './WaitingIndicator';

interface BankTransferPanelProps {
  session: PaymentSession;
  onRequestAccount: () => void;
  onConfirmPaid: () => void;
  onExpire: () => void;
}

const ICON = 'w-3.5 h-3.5';

export default function BankTransferPanel({
  session,
  onRequestAccount,
  onConfirmPaid,
  onExpire,
}: BankTransferPanelProps) {
  const amount = formatQuote(session.expected_amount, session.asset_code);
  const issued = Boolean(session.account_number);

  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">Pay via bank transfer</h2>

      <div className="mt-6">
        {!issued ? (
          <>
            <Step
              icon={<Banknote className="w-4 h-4" />}
              title="Get a dedicated account for this payment."
            >
              <button
                type="button"
                onClick={onRequestAccount}
                className="w-full h-12 rounded-lg bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-[#ffe23d] active:scale-[0.99] transition cursor-pointer"
              >
                Show account details
              </button>
              <p className="mt-2.5 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                The account is yours alone and stays open for 30 minutes, so only ask for it when
                you&apos;re ready to send the transfer.
              </p>
            </Step>

            <Step
              last
              icon={<CircleCheck className="w-4 h-4" />}
              title="Transfer the amount, and this page updates on its own."
            />
          </>
        ) : (
          <>
            <Step
              icon={<Banknote className="w-4 h-4" />}
              title="Transfer the total amount to the account below."
            >
              <div className="space-y-2">
                <DetailField
                  label="Amount"
                  value={amount.replace(/,/g, '')}
                  display={
                    <span className="font-semibold">
                      {getAssetSymbol(session.asset_code)}
                      {amount}
                    </span>
                  }
                  icon={<Wallet className={ICON} />}
                />
                <DetailField
                  label="Bank name"
                  value={session.bank_name ?? ''}
                  icon={<Building2 className={ICON} />}
                />
                <DetailField
                  label="Account name"
                  value={session.account_name ?? ''}
                  icon={<BadgeCheck className={ICON} />}
                />
                <DetailField
                  label="Account number"
                  value={session.account_number ?? ''}
                  display={<span className="tracking-wider">{session.account_number}</span>}
                  icon={<Hash className={ICON} />}
                  mono
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {session.expires_at && (
                  <Countdown expiresAt={session.expires_at} onExpire={onExpire} />
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Send the exact amount
                </span>
              </div>
            </Step>

            <Step
              last
              icon={<CircleCheck className="w-4 h-4" />}
              title="Once you've sent it, let us know."
            >
              <WaitingIndicator
                label="Waiting for your transfer"
                sublabel="Usually within a minute of sending"
              />

              <button
                type="button"
                onClick={onConfirmPaid}
                className="mt-3 w-full h-12 rounded-lg bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-[#ffe23d] active:scale-[0.99] transition cursor-pointer"
              >
                I have paid
              </button>
              <p className="mt-2.5 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                You can also just close this page — it settles on its own once the transfer lands.
              </p>
            </Step>
          </>
        )}
      </div>
    </div>
  );
}
