'use client';

import React, { useRef, useState } from 'react';
import { ArrowDown, Building2, Check, ChevronDown, Loader2, Plus } from 'lucide-react';

import { invalidate, v1 } from '../../lib/console/client';
import { bankName, useAssets, useBalances, useBanks, usePayoutAccounts } from '../../lib/console/data';
import { maskAccount } from '../../lib/console/format';
import { decimalsFor, formatMajor, toMajor, toMinor } from '../../lib/console/money';
import type { PayoutAccount } from '../../lib/console/models';
import CurrencyIcon from './CurrencyIcon';
import type { Notify } from './nav';
import { Button, CopyButton, Drawer, EmptyState, Money, StatusBadge, cx } from './ui';

type Step = 'details' | 'review' | 'sending' | 'done';

interface PayoutResult {
  id: string;
  status: string;
  amount: string;
}

/** "1234567.5" → "1,234,567.5" — keeps whatever decimals the user has typed. */
function group(raw: string): string {
  if (!raw) return '';
  const [int, dec] = raw.split('.');
  const grouped = (int || '0').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${grouped}.${dec}` : grouped;
}

function Stepper({ step }: { step: Step }) {
  const index = step === 'details' ? 0 : step === 'done' ? 2 : 1;
  return (
    <ol className="flex items-center gap-2 mb-6" aria-label="Progress">
      {['Details', 'Review', 'Done'].map((label, i, all) => {
        const done = i < index;
        const current = i === index;
        return (
          <li key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <span
              aria-current={current ? 'step' : undefined}
              className={cx(
                'size-6 shrink-0 rounded-full inline-flex items-center justify-center text-[11px] font-semibold',
                done && 'bg-brand text-brand-ink',
                current && 'bg-ink text-canvas',
                !done && !current && 'bg-subtle text-ink-3 border border-line'
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cx('text-xs whitespace-nowrap', current ? 'text-ink font-medium' : 'text-ink-3')}>{label}</span>
            {i < all.length - 1 && <span aria-hidden className={cx('h-px flex-1', done ? 'bg-brand' : 'bg-line')} />}
          </li>
        );
      })}
    </ol>
  );
}

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className={cx('text-sm text-right tabular-nums', strong ? 'font-semibold text-ink' : 'text-ink')}>{children}</dd>
    </div>
  );
}

function AccountIcon() {
  return (
    <span aria-hidden className="size-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-line bg-subtle text-ink-2">
      <Building2 className="size-4" />
    </span>
  );
}

function WithdrawFlow({
  businessName,
  onClose,
  onManageAccounts,
  notify,
}: {
  businessName: string;
  onClose: () => void;
  onManageAccounts: () => void;
  notify: Notify;
}) {
  const { data: assets } = useAssets();
  const balances = useBalances();
  const accounts = usePayoutAccounts();
  const banks = useBanks();
  const [step, setStep] = useState<Step>('details');
  const [accountId, setAccountId] = useState('');
  const [picking, setPicking] = useState(false);
  const [raw, setRaw] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PayoutResult | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const decimals = decimalsFor('NGN', assets);
  const available = toMajor(balances.data?.find((b) => b.asset_code === 'NGN')?.available ?? '0', decimals);
  const list = accounts.data ?? [];
  const account: PayoutAccount | undefined = list.find((a) => a.id === accountId) ?? list[0];
  const amount = Number(raw) || 0;
  const minor = toMinor(raw, decimals);

  const problem = !amount
    ? 'Enter how much to withdraw.'
    : !minor
      ? 'Use at most two decimal places.'
      : amount > available + 1e-9
        ? 'That’s more than your available balance.'
        : !account
          ? 'Add a bank account to withdraw to.'
          : null;

  const send = async () => {
    if (!account || !minor) return;
    setStep('sending');
    setError(null);
    try {
      const payout = await v1.post<PayoutResult>('payouts', {
        amount: minor,
        bank_code: account.bank_code,
        account_number: account.account_number,
        account_name: account.account_name,
      });
      setResult(payout);
      notify(`Withdrawal of ${formatMajor(amount, 'NGN')} sent`);
      invalidate(`balances`, `transactions`, `summary`);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The withdrawal didn’t go through.');
      setStep('review');
    }
  };

  /* ---------------- Done ---------------- */
  if (step === 'done' && account) {
    return (
      <Drawer
        open
        onClose={onClose}
        title="Withdrawal sent"
        width="max-w-2xl"
        footer={
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <div className="text-center pt-2">
          <span className="mx-auto size-16 rounded-full bg-brand text-brand-ink inline-flex items-center justify-center fx-pop-in shadow-[0_0_0_8px_var(--color-gold-soft)]">
            <Check className="size-8" strokeWidth={2.5} />
          </span>
          <Money value={amount} asset="NGN" className="mt-6 block text-[2rem] leading-tight font-semibold text-ink" />
          <p className="mt-1 text-sm text-ink-2">is on its way to {account.account_name}</p>
        </div>
        <dl className="mt-6 rounded-xl border border-line px-4 divide-y divide-line">
          <Row label="Status">{result ? <StatusBadge status={result.status} /> : '—'}</Row>
          <Row label="To">
            {bankName(account.bank_code, banks.data?.banks)} {maskAccount(account.account_number)}
          </Row>
          {result && (
            <div className="flex items-center justify-between gap-4 py-1.5">
              <dt className="text-sm text-ink-3">Payout ID</dt>
              <dd className="flex items-center gap-1 font-mono text-[13px] text-ink">
                {result.id}
                <CopyButton value={result.id} label="Copy payout ID" />
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-xs text-ink-3 text-center">Track it under Transactions. Bank transfers usually land within minutes.</p>
      </Drawer>
    );
  }

  /* ---------------- Review ---------------- */
  if ((step === 'review' || step === 'sending') && account) {
    const sending = step === 'sending';
    return (
      <Drawer
        open
        onClose={sending ? () => {} : onClose}
        title="Review withdrawal"
        description="Check the details. Once sent, a bank transfer can’t be pulled back."
        width="max-w-2xl"
        footer={
          <>
            <Button onClick={() => setStep('details')} disabled={sending}>
              Back
            </Button>
            <Button variant="primary" disabled={sending} onClick={send} className="sm:min-w-44">
              {sending && <Loader2 className="size-4 animate-spin" />}
              {sending ? 'Sending…' : `Withdraw ${formatMajor(amount, 'NGN')}`}
            </Button>
          </>
        }
      >
        <Stepper step={step} />
        <div className="rounded-xl border border-line overflow-hidden">
          <div className="px-5 py-5 text-center bg-subtle/60 border-b border-line">
            <p className="text-xs text-ink-3">You’re sending</p>
            <Money value={amount} asset="NGN" className="mt-1 block text-[2rem] leading-tight font-semibold text-ink" />
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <CurrencyIcon asset="NGN" className="size-9" />
              <span className="min-w-0">
                <span className="block text-xs text-ink-3">From</span>
                <span className="block text-sm font-medium text-ink">Naira balance · {businessName}</span>
              </span>
            </div>
            <div className="ml-[18px] my-1 h-5 border-l border-dashed border-line-strong relative">
              <ArrowDown className="absolute -left-[7px] top-1 size-3.5 text-gold bg-surface" />
            </div>
            <div className="flex items-center gap-3">
              <AccountIcon />
              <span className="min-w-0">
                <span className="block text-xs text-ink-3">To</span>
                <span className="block text-sm font-medium text-ink truncate">{account.account_name}</span>
                <span className="block text-xs text-ink-3">
                  {bankName(account.bank_code, banks.data?.banks)} · <span className="font-mono">{account.account_number}</span>
                </span>
              </span>
            </div>
          </div>
          <dl className="px-5 py-1 border-t border-line divide-y divide-line">
            <Row label="Balance after">{formatMajor(available - amount, 'NGN')}</Row>
          </dl>
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-negative/30 bg-negative/5 px-4 py-3 text-sm text-negative">
            {error}
          </p>
        )}
      </Drawer>
    );
  }

  /* ---------------- Details ---------------- */
  const showError = touched && problem;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Withdraw to bank"
      description="Send naira from your Fluxel balance to one of your bank accounts."
      width="max-w-2xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            className="sm:min-w-32"
            disabled={list.length === 0}
            onClick={() => {
              setTouched(true);
              if (problem) {
                input.current?.focus();
                return;
              }
              setPicking(false);
              setStep('review');
            }}
          >
            Continue
          </Button>
        </>
      }
    >
      <Stepper step={step} />

      <div className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 mb-6">
        <CurrencyIcon asset="NGN" className="size-9" />
        <span className="flex-1">
          <span className="block text-xs text-ink-3">Available</span>
          {balances.loading ? (
            <span className="block text-sm text-ink-3">Loading…</span>
          ) : (
            <Money value={available} asset="NGN" className="block text-lg font-semibold text-ink" />
          )}
        </span>
      </div>

      <label htmlFor="withdraw-amount" className="block text-sm font-medium text-ink mb-2">
        Amount
      </label>
      <div
        className={cx(
          'rounded-xl border bg-surface transition-colors focus-within:ring-2',
          showError && problem !== 'Add a bank account to withdraw to.'
            ? 'border-negative focus-within:ring-negative/15'
            : 'border-line-strong focus-within:border-gold focus-within:ring-brand/25'
        )}
      >
        <div className="flex items-baseline gap-2 px-4 pt-3">
          <span className="text-[1.75rem] font-semibold text-ink-3">₦</span>
          <input
            ref={input}
            id="withdraw-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={group(raw)}
            onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{0,2}).*/, '$1'))}
            placeholder="0.00"
            aria-invalid={Boolean(showError) || undefined}
            className="min-w-0 flex-1 bg-transparent outline-none text-[1.75rem] font-semibold tabular-nums tracking-tight text-ink placeholder:text-line-strong"
          />
        </div>
        <div className="flex justify-end gap-1 px-4 pb-3 pt-1">
          {[
            [0.25, '25%'],
            [0.5, '50%'],
            [1, 'Max'],
          ].map(([f, label]) => (
            <button
              key={label as string}
              type="button"
              onClick={() => setRaw(String(Math.floor(available * (f as number) * 100) / 100))}
              className="h-7 px-2.5 rounded-md border border-line text-xs font-medium text-ink-2 hover:border-gold hover:text-ink cursor-pointer transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {showError && problem !== 'Add a bank account to withdraw to.' && <p className="mt-2 text-xs text-negative">{problem}</p>}

      <p className="text-sm font-medium text-ink mt-6 mb-2">To</p>
      {accounts.loading ? (
        <p className="text-sm text-ink-3">Loading your accounts…</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line">
          <EmptyState title="No bank account yet" description="Add the account you want your money sent to." />
          <div className="flex justify-center pb-6 -mt-6">
            <Button size="sm" onClick={onManageAccounts}>
              <Plus className="size-4" />
              Add bank account
            </Button>
          </div>
        </div>
      ) : (
        <div className={cx('rounded-xl border transition-colors', picking ? 'border-gold ring-2 ring-brand/25' : 'border-line-strong')}>
          <button type="button" aria-expanded={picking} onClick={() => setPicking((v) => !v)} className="w-full flex items-center gap-3 p-3 text-left cursor-pointer">
            <AccountIcon />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink truncate">{account!.label || account!.account_name}</span>
              <span className="block text-xs text-ink-3">
                {bankName(account!.bank_code, banks.data?.banks)} · <span className="font-mono">{account!.account_number}</span>
              </span>
            </span>
            <ChevronDown className={cx('size-4 text-ink-3 transition-transform', picking && 'rotate-180')} />
          </button>
          {picking && (
            <ul role="listbox" aria-label="Bank accounts" className="border-t border-line p-1.5">
              {list.map((a) => {
                const active = a.id === account?.id;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setAccountId(a.id);
                        setPicking(false);
                      }}
                      className={cx('w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left cursor-pointer', active ? 'bg-gold-soft' : 'hover:bg-subtle')}
                    >
                      <AccountIcon />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink truncate">{a.label || a.account_name}</span>
                        <span className="block text-xs text-ink-3 truncate">
                          {a.account_name} · {bankName(a.bank_code, banks.data?.banks)} {maskAccount(a.account_number)}
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
      )}
    </Drawer>
  );
}

export default function WithdrawModal({
  open,
  businessName,
  onClose,
  onManageAccounts,
  notify,
}: {
  open: boolean;
  businessName: string;
  onClose: () => void;
  onManageAccounts: () => void;
  notify: Notify;
}) {
  if (!open) return null;
  return <WithdrawFlow businessName={businessName} onClose={onClose} onManageAccounts={onManageAccounts} notify={notify} />;
}
