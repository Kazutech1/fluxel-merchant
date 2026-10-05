'use client';

import React, { useRef, useState } from 'react';
import { ArrowDown, Building2, Check, ChevronDown, Clock, Loader2, Lock, Plus, Wallet } from 'lucide-react';

import OtpInput from '../common/OtpInput';
import {
  NGN_PER_USDT,
  WITHDRAWAL_FEE,
  convert,
  destinationSummary,
  formatMoney,
} from '../../lib/console/format';
import type { ConsoleData, Currency, Destination, Transaction } from '../../lib/console/types';
import type { WithdrawRequest } from '../../lib/console/useConsoleData';
import CurrencyIcon from './CurrencyIcon';
import { Button, CopyButton, Drawer, Money, cx } from './ui';

const MIN_WITHDRAWAL: Record<Currency, number> = { NGN: 1000, USDT: 5 };
const BALANCE_NAME: Record<Currency, string> = { NGN: 'Naira', USDT: 'USDT' };

export function DestinationIcon({ d }: { d: Destination }) {
  return (
    <span
      aria-hidden
      className="size-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-line bg-subtle text-ink-2"
    >
      {d.type === 'bank' ? <Building2 className="size-4" /> : <Wallet className="size-4" />}
    </span>
  );
}

/** How long a payout usually takes, by where it's going. */
function arrival(d: Destination | null): string {
  if (!d) return '—';
  if (d.type === 'bank') return 'Usually within 5 minutes';
  return d.network === 'Ethereum' ? 'About 5 minutes' : 'About 1 minute';
}

/** "1234567.5" → "1,234,567.5" — keeps whatever decimals the user has typed. */
function group(raw: string): string {
  if (!raw) return '';
  const [int, dec] = raw.split('.');
  const grouped = (int || '0').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${grouped}.${dec}` : grouped;
}

type Step = 'details' | 'review' | 'sending' | 'done';

function Stepper({ step }: { step: Step }) {
  const index = step === 'details' ? 0 : step === 'done' ? 2 : 1;
  const steps = ['Details', 'Review', 'Done'];
  return (
    <ol className="flex items-center gap-2 mb-6" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < index;
        const current = i === index;
        return (
          <li key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <span
              aria-current={current ? 'step' : undefined}
              className={cx(
                'size-6 shrink-0 rounded-full inline-flex items-center justify-center text-[11px] font-semibold transition-colors',
                done && 'bg-brand text-brand-ink',
                current && 'bg-ink text-canvas',
                !done && !current && 'bg-subtle text-ink-3 border border-line'
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cx('text-xs whitespace-nowrap', current ? 'text-ink font-medium' : 'text-ink-3')}>{label}</span>
            {i < steps.length - 1 && <span aria-hidden className={cx('h-px flex-1', done ? 'bg-brand' : 'bg-line')} />}
          </li>
        );
      })}
    </ol>
  );
}

function SummaryRow({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className={cx('text-sm text-right tabular-nums', strong ? 'font-semibold text-ink' : 'text-ink')}>{children}</dd>
    </div>
  );
}

function DestinationLines({ d }: { d: Destination }) {
  return d.type === 'bank' ? (
    <>
      <span className="block text-sm font-medium text-ink truncate">{d.accountName}</span>
      <span className="block text-xs text-ink-3 truncate">
        {d.bankName} · <span className="font-mono">{d.accountNumber}</span>
      </span>
    </>
  ) : (
    <>
      <span className="block text-sm font-medium text-ink truncate">
        {d.label} · USDT on {d.network}
      </span>
      <span className="block text-xs text-ink-3 font-mono truncate">{d.address}</span>
    </>
  );
}

function WithdrawFlow({
  initialFrom,
  data,
  onClose,
  onWithdraw,
  onManageAccounts,
  onViewTxn,
}: {
  initialFrom: Currency;
  data: ConsoleData;
  onClose: () => void;
  onWithdraw: (req: WithdrawRequest) => Transaction | null;
  onManageAccounts: () => void;
  onViewTxn: (id: string) => void;
}) {
  const [step, setStep] = useState<Step>('details');
  const [from, setFrom] = useState<Currency>(initialFrom);
  const [destinationId, setDestinationId] = useState(data.rules[initialFrom].destinationId);
  const [picking, setPicking] = useState(false);
  const [raw, setRaw] = useState('');
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<Transaction | null>(null);
  const amountInput = useRef<HTMLInputElement>(null);

  const balance = data.balances[from];
  const fee = WITHDRAWAL_FEE[from];
  const amount = Number(raw) || 0;
  const destination = data.destinations.find((d) => d.id === destinationId) ?? null;
  const crosses = destination !== null && destination.currency !== from;
  const receives = destination ? convert(amount, from, destination.currency) : 0;
  const max = Math.max(0, Math.floor((balance - fee) * 100) / 100);

  const error = !amount
    ? 'Enter how much to withdraw.'
    : amount < MIN_WITHDRAWAL[from]
      ? `The minimum is ${formatMoney(MIN_WITHDRAWAL[from], from)}.`
      : amount + fee > balance + 1e-9
        ? `That’s more than your balance after the ${formatMoney(fee, from)} fee.`
        : !destination
          ? 'Choose where to send the money.'
          : null;

  const switchFrom = (next: Currency) => {
    if (next === from) return;
    setFrom(next);
    setDestinationId(data.rules[next].destinationId);
    setRaw('');
    setTouched(false);
    setPicking(false);
  };

  const setFraction = (f: number) => {
    const v = f === 1 ? max : Math.floor(max * f * 100) / 100;
    setRaw(String(v));
    setTouched(false);
  };

  const submit = () => {
    if (!destination) return;
    setStep('sending');
    // A beat of latency so it reads as a real request going out.
    window.setTimeout(() => {
      setResult(onWithdraw({ from, amount, destinationId: destination.id, trigger: 'manual' }));
      setStep('done');
    }, 1100);
  };

  /* ---------------------------------------------------------------- */
  /* Done                                                             */
  /* ---------------------------------------------------------------- */
  if (step === 'done' && destination) {
    return (
      <Drawer
        open
        onClose={onClose}
        title="Withdrawal sent"
        width="max-w-2xl"
        footer={
          <>
            {result && (
              <Button
                onClick={() => {
                  onClose();
                  onViewTxn(result.id);
                }}
              >
                View transaction
              </Button>
            )}
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </>
        }
      >
        <div className="text-center pt-2">
          <span className="mx-auto size-16 rounded-full bg-brand text-brand-ink inline-flex items-center justify-center fx-pop-in shadow-[0_0_0_8px_var(--color-gold-soft)]">
            <Check className="size-8" strokeWidth={2.5} />
          </span>
          <Money amount={crosses ? receives : amount} currency={destination.currency} className="mt-6 block text-[2rem] leading-tight font-semibold text-ink" />
          <p className="mt-1 text-sm text-ink-2">
            is on its way to {destination.type === 'bank' ? destination.accountName : destination.label}
          </p>
        </div>
        <dl className="mt-6 rounded-xl border border-line px-4 divide-y divide-line">
          <SummaryRow label="Status">
            <span className="inline-flex items-center gap-1.5 text-pending font-medium">
              <span className="size-1.5 rounded-full bg-pending animate-pulse" />
              Processing
            </span>
          </SummaryRow>
          <SummaryRow label="To">{destinationSummary(destination)}</SummaryRow>
          <SummaryRow label="Expected">{arrival(destination)}</SummaryRow>
          {result && (
            <div className="flex items-center justify-between gap-4 py-1.5">
              <dt className="text-sm text-ink-3">Reference</dt>
              <dd className="flex items-center gap-1 font-mono text-[13px] text-ink">
                {result.reference}
                <CopyButton value={result.reference} label="Copy reference" />
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-xs text-ink-3 text-center">We’ll notify you when it lands. A receipt has been emailed to you.</p>
      </Drawer>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Review                                                           */
  /* ---------------------------------------------------------------- */
  if ((step === 'review' || step === 'sending') && destination) {
    const sending = step === 'sending';
    return (
      <Drawer
        open
        onClose={sending ? () => {} : onClose}
        title="Review withdrawal"
        description="Check the details, then confirm with your authenticator code."
        width="max-w-2xl"
        footer={
          <>
            <Button onClick={() => setStep('details')} disabled={sending}>
              Back
            </Button>
            <Button variant="primary" disabled={code.length !== 6 || sending} onClick={submit} className="sm:min-w-44">
              {sending && <Loader2 className="size-4 animate-spin" />}
              {sending ? 'Sending…' : `Withdraw ${formatMoney(amount, from)}`}
            </Button>
          </>
        }
      >
        <Stepper step={step} />

        <div className="rounded-xl border border-line overflow-hidden">
          <div className="px-5 py-5 text-center bg-subtle/60 border-b border-line">
            <p className="text-xs text-ink-3">You’re sending</p>
            <Money amount={amount} currency={from} className="mt-1 block text-[2rem] leading-tight font-semibold text-ink" />
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <CurrencyIcon currency={from} className="size-9 shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs text-ink-3">From</span>
                <span className="block text-sm font-medium text-ink">
                  {BALANCE_NAME[from]} balance · {data.business.tradingName}
                </span>
              </span>
            </div>
            <div className="ml-[18px] my-1 h-5 border-l border-dashed border-line-strong relative">
              <ArrowDown className="absolute -left-[7px] top-1 size-3.5 text-gold bg-surface" />
            </div>
            <div className="flex items-center gap-3">
              <DestinationIcon d={destination} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-ink-3">To</span>
                <DestinationLines d={destination} />
              </span>
            </div>
          </div>

          <dl className="px-5 py-2 border-t border-line divide-y divide-line">
            <SummaryRow label="Fee">
              <Money amount={fee} currency={from} />
            </SummaryRow>
            <SummaryRow label="Total debited">
              <Money amount={amount + fee} currency={from} />
            </SummaryRow>
            {crosses && <SummaryRow label="Exchange rate">{formatMoney(NGN_PER_USDT, 'NGN')} = 1 USDT</SummaryRow>}
            <SummaryRow label="Recipient gets" strong>
              <Money amount={receives} currency={destination.currency} />
            </SummaryRow>
            <SummaryRow label="Arrives">{arrival(destination)}</SummaryRow>
          </dl>
        </div>

        <div className="mt-6">
          <p className="flex items-center gap-2 text-sm font-medium text-ink mb-3">
            <Lock className="size-4 text-gold" />
            Authenticator code
          </p>
          <OtpInput label="Authenticator code" value={code} onChange={setCode} autoFocus disabled={sending} />
          <p className="mt-2 text-xs text-ink-3">Open your authenticator app for the 6-digit code. In the demo, any 6 digits work.</p>
        </div>
      </Drawer>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Details                                                          */
  /* ---------------------------------------------------------------- */
  const showError = touched && error;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Withdraw funds"
      description="Move money from your Fluxel balance to your bank or wallet."
      width="max-w-2xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            className="sm:min-w-32"
            onClick={() => {
              setTouched(true);
              if (error) {
                if (!amount || amount + fee > balance) amountInput.current?.focus();
                return;
              }
              setPicking(false);
              setCode('');
              setStep('review');
            }}
          >
            Continue
          </Button>
        </>
      }
    >
      <Stepper step={step} />

      {/* From */}
      <p className="text-sm font-medium text-ink mb-2">From</p>
      <div role="radiogroup" aria-label="Withdraw from" className="grid grid-cols-2 gap-2">
        {(['NGN', 'USDT'] as const).map((c) => {
          const active = c === from;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => switchFrom(c)}
              className={cx(
                'relative flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-colors',
                active ? 'border-gold bg-gold-soft ring-2 ring-brand/25' : 'border-line hover:border-line-strong'
              )}
            >
              <CurrencyIcon currency={c} className="size-9 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{BALANCE_NAME[c]}</span>
                <Money amount={data.balances[c]} currency={c} compact className="block text-xs text-ink-3" />
              </span>
              {active && (
                <span className="absolute top-2 right-2 size-4 rounded-full bg-brand text-brand-ink inline-flex items-center justify-center">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Amount */}
      <label htmlFor="withdraw-amount" className="block text-sm font-medium text-ink mt-6 mb-2">
        Amount
      </label>
      <div
        className={cx(
          'rounded-xl border bg-surface transition-colors focus-within:ring-2',
          showError && (!amount || amount < MIN_WITHDRAWAL[from] || amount + fee > balance)
            ? 'border-negative focus-within:ring-negative/15'
            : 'border-line-strong focus-within:border-gold focus-within:ring-brand/25'
        )}
      >
        <div className="flex items-baseline gap-2 px-4 pt-3">
          {from === 'NGN' && <span className="text-[1.75rem] font-semibold text-ink-3">₦</span>}
          <input
            ref={amountInput}
            id="withdraw-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={group(raw)}
            onChange={(e) => {
              const next = e.target.value
                .replace(/[^\d.]/g, '')
                .replace(/(\..*)\./g, '$1')
                .replace(/(\.\d{0,2}).*/, '$1');
              setRaw(next);
            }}
            placeholder="0.00"
            aria-invalid={Boolean(showError) || undefined}
            className="min-w-0 flex-1 bg-transparent outline-none text-[1.75rem] font-semibold tabular-nums tracking-tight text-ink placeholder:text-line-strong"
          />
          {from === 'USDT' && <span className="text-base font-semibold text-ink-3">USDT</span>}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
          <span className="text-xs text-ink-3">
            Available <Money amount={balance} currency={from} className="text-ink-2" />
          </span>
          <span className="flex gap-1">
            {[
              [0.25, '25%'],
              [0.5, '50%'],
              [1, 'Max'],
            ].map(([f, label]) => (
              <button
                key={label as string}
                type="button"
                onClick={() => setFraction(f as number)}
                className="h-7 px-2.5 rounded-md border border-line text-xs font-medium text-ink-2 hover:border-gold hover:text-ink cursor-pointer transition-colors"
              >
                {label}
              </button>
            ))}
          </span>
        </div>
      </div>
      {showError && error !== 'Choose where to send the money.' && <p className="mt-2 text-xs text-negative">{error}</p>}

      {/* To */}
      <div className="flex items-baseline justify-between mt-6 mb-2">
        <p className="text-sm font-medium text-ink">To</p>
        {destination && destination.currency !== from && <span className="text-xs text-gold">Converted to {destination.currency}</span>}
      </div>
      <div className={cx('rounded-xl border transition-colors', picking ? 'border-gold ring-2 ring-brand/25' : 'border-line-strong')}>
        <button
          type="button"
          aria-expanded={picking}
          onClick={() => setPicking((v) => !v)}
          className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
        >
          {destination ? (
            <>
              <DestinationIcon d={destination} />
              <span className="min-w-0 flex-1">
                <DestinationLines d={destination} />
              </span>
            </>
          ) : (
            <span className="flex-1 text-sm text-ink-3 px-1">Choose an account</span>
          )}
          <ChevronDown className={cx('size-4 text-ink-3 transition-transform', picking && 'rotate-180')} />
        </button>
        {picking && (
          <ul role="listbox" aria-label="Payout accounts" className="border-t border-line p-1.5 max-h-60 overflow-y-auto">
            {data.destinations.map((d) => {
              const active = d.id === destinationId;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setDestinationId(d.id);
                      setPicking(false);
                    }}
                    className={cx(
                      'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left cursor-pointer',
                      active ? 'bg-gold-soft' : 'hover:bg-subtle'
                    )}
                  >
                    <DestinationIcon d={d} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink truncate">{d.label}</span>
                      <span className="block text-xs text-ink-3 truncate">
                        {destinationSummary(d)} · {d.currency}
                      </span>
                    </span>
                    {active && <Check className="size-4 text-gold" />}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={onManageAccounts}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left text-sm text-ink-2 hover:bg-subtle hover:text-ink cursor-pointer"
              >
                <span className="size-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-dashed border-line-strong">
                  <Plus className="size-4" />
                </span>
                Add a new account
              </button>
            </li>
          </ul>
        )}
      </div>
      {showError && error === 'Choose where to send the money.' && <p className="mt-2 text-xs text-negative">{error}</p>}

      {/* Summary */}
      <dl className="mt-6 rounded-xl bg-subtle/70 border border-line px-4 py-1 divide-y divide-line">
        <SummaryRow label="Fee">
          <Money amount={fee} currency={from} />
        </SummaryRow>
        {crosses && <SummaryRow label="Exchange rate">{formatMoney(NGN_PER_USDT, 'NGN')} = 1 USDT</SummaryRow>}
        <SummaryRow label="Recipient gets" strong>
          {destination ? <Money amount={amount > 0 ? receives : 0} currency={destination.currency} /> : '—'}
        </SummaryRow>
        <SummaryRow label="Arrives">
          <span className="inline-flex items-center gap-1.5 text-ink-2">
            <Clock className="size-3.5" />
            {arrival(destination)}
          </span>
        </SummaryRow>
      </dl>
    </Drawer>
  );
}

export default function WithdrawModal({
  from,
  data,
  onClose,
  onWithdraw,
  onManageAccounts,
  onViewTxn,
}: {
  from: Currency | null;
  data: ConsoleData;
  onClose: () => void;
  onWithdraw: (req: WithdrawRequest) => Transaction | null;
  onManageAccounts: () => void;
  onViewTxn: (id: string) => void;
}) {
  if (!from) return null;
  return (
    <WithdrawFlow
      key={from}
      initialFrom={from}
      data={data}
      onClose={onClose}
      onWithdraw={onWithdraw}
      onManageAccounts={onManageAccounts}
      onViewTxn={onViewTxn}
    />
  );
}
