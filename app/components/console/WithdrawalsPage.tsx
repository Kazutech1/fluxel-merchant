'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Loader2, Plus } from 'lucide-react';

import {
  WITHDRAWAL_FEE,
  describeRule,
  destinationSummary,
  formatMoney,
  formatNextRun,
  formatWhen,
  nextScheduledRun,
  weekdayName,
} from '../../lib/console/format';
import type {
  ConsoleData,
  CryptoNetwork,
  Currency,
  Destination,
  PayoutFrequency,
  PayoutMode,
  PayoutRule,
} from '../../lib/console/types';
import type { ConsoleActions } from '../../lib/console/useConsoleData';
import CurrencyIcon from './CurrencyIcon';
import { DestinationIcon } from './WithdrawModal';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Modal,
  Money,
  PageHeader,
  Segmented,
  StatusBadge,
  Tag,
  cx,
  inputClass,
} from './ui';
import { txnTitle } from './txn';

const MODE_LABEL: Record<PayoutMode, string> = { manual: 'Manual', automatic: 'Automatic', scheduled: 'Scheduled' };

const MODE_HELP: Record<PayoutMode, string> = {
  manual: 'Money stays in your Fluxel balance until you withdraw it yourself.',
  automatic: 'As soon as your balance reaches an amount you set, we send it to your account.',
  scheduled: 'We send your balance to your account on a fixed day and time.',
};

/* ------------------------------------------------------------------ */
/* Payout rule editor                                                  */
/* ------------------------------------------------------------------ */

function RuleModal({
  rule,
  data,
  onClose,
  onSave,
}: {
  rule: PayoutRule;
  data: ConsoleData;
  onClose: () => void;
  onSave: (rule: PayoutRule) => void;
}) {
  const [draft, setDraft] = useState<PayoutRule>(rule);

  const set = <K extends keyof PayoutRule>(key: K, value: PayoutRule[K]) => setDraft({ ...draft, [key]: value });
  const c = draft.currency;
  const fee = WITHDRAWAL_FEE[c];

  const error =
    draft.mode === 'automatic' && draft.threshold <= draft.reserve + fee
      ? 'The trigger amount must be more than what you keep, plus the fee.'
      : draft.mode !== 'manual' && !data.destinations.some((d) => d.id === draft.destinationId)
        ? 'Choose an account to pay into.'
        : null;

  const willFireNow = draft.mode === 'automatic' && !error && data.balances[c] >= draft.threshold;
  const next = nextScheduledRun(draft);

  const amountInput = (key: 'threshold' | 'reserve', id: string) => (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={String(draft[key])}
        onChange={(e) => set(key, Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
        className={cx(inputClass, '!pr-16 font-mono')}
      />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3">{c}</span>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`${c === 'NGN' ? 'Naira' : 'USDT'} payouts`}
      description="Choose when money leaves this balance."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={Boolean(error)}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <Segmented<PayoutMode>
            label="Payout mode"
            value={draft.mode}
            onChange={(m) => set('mode', m)}
            className="w-full"
            options={[
              { value: 'manual', label: 'Manual' },
              { value: 'automatic', label: 'Automatic' },
              { value: 'scheduled', label: 'Scheduled' },
            ]}
          />
          <p className="mt-2 text-sm text-ink-2">{MODE_HELP[draft.mode]}</p>
        </div>

        {draft.mode !== 'manual' && (
          <Field label="Pay into" htmlFor="rule-dest">
            <select
              id="rule-dest"
              value={draft.destinationId}
              onChange={(e) => set('destinationId', e.target.value)}
              className={cx(inputClass, 'cursor-pointer')}
            >
              {data.destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label} — {destinationSummary(d)}
                  {d.currency !== c ? ` (converted to ${d.currency})` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}

        {draft.mode === 'automatic' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="When balance reaches" htmlFor="rule-threshold">
              {amountInput('threshold', 'rule-threshold')}
            </Field>
            <Field label="Always keep" htmlFor="rule-reserve" hint="Left in your balance">
              {amountInput('reserve', 'rule-reserve')}
            </Field>
          </div>
        )}

        {draft.mode === 'scheduled' && (
          <>
            <div>
              <p className="text-sm font-medium text-ink-2 mb-2">How often</p>
              <Segmented<PayoutFrequency>
                label="Frequency"
                value={draft.frequency}
                onChange={(f) => set('frequency', f)}
                className="w-full"
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {draft.frequency === 'weekly' && (
                <Field label="Day" htmlFor="rule-weekday">
                  <select
                    id="rule-weekday"
                    value={draft.weekday}
                    onChange={(e) => set('weekday', Number(e.target.value))}
                    className={cx(inputClass, 'cursor-pointer')}
                  >
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <option key={d} value={d}>
                        {weekdayName(d)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {draft.frequency === 'monthly' && (
                <Field label="Day of month" htmlFor="rule-monthday">
                  <select
                    id="rule-monthday"
                    value={draft.monthDay}
                    onChange={(e) => set('monthDay', Number(e.target.value))}
                    className={cx(inputClass, 'cursor-pointer')}
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Time" htmlFor="rule-time">
                <input
                  id="rule-time"
                  type="time"
                  value={draft.time}
                  onChange={(e) => set('time', e.target.value || '17:00')}
                  className={cx(inputClass, 'font-mono')}
                />
              </Field>
            </div>
            <Field label="Always keep" htmlFor="rule-reserve" hint="Left in your balance after each payout">
              {amountInput('reserve', 'rule-reserve')}
            </Field>
          </>
        )}

        <div className="rounded-lg bg-subtle border border-line px-4 py-3 text-sm">
          <p className="text-ink">{describeRule(draft)}.</p>
          {next && <p className="mt-0.5 text-ink-3">Next payout: {formatNextRun(next)}</p>}
          {willFireNow && (
            <p className="mt-0.5 text-pending">
              Your balance is already above this — a payout will start as soon as you save.
            </p>
          )}
          {error && <p className="mt-0.5 text-negative">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Add payout account                                                  */
/* ------------------------------------------------------------------ */

const BANKS = [
  'Access Bank',
  'First Bank',
  'GTBank',
  'Kuda',
  'Moniepoint',
  'OPay',
  'Stanbic IBTC',
  'UBA',
  'Wema Bank',
  'Zenith Bank',
];

const NETWORKS: { value: CryptoNetwork; label: string }[] = [
  { value: 'TRON', label: 'TRON (TRC-20)' },
  { value: 'BSC', label: 'BNB Smart Chain (BEP-20)' },
  { value: 'Ethereum', label: 'Ethereum (ERC-20)' },
];

function validAddress(network: CryptoNetwork, address: string): boolean {
  return network === 'TRON' ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address) : /^0x[0-9a-fA-F]{40}$/.test(address);
}

function AddAccountModal({
  businessName,
  onClose,
  onAdd,
}: {
  businessName: string;
  onClose: () => void;
  onAdd: (d: Destination) => void;
}) {
  const [type, setType] = useState<'bank' | 'crypto'>('bank');
  const [bank, setBank] = useState(BANKS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [lookup, setLookup] = useState<{ key: string; name: string } | null>(null);
  const [network, setNetwork] = useState<CryptoNetwork>('TRON');
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [touched, setTouched] = useState(false);

  // Simulated account-name lookup once ten digits are in. The result is keyed
  // to the bank + number it was for, so editing either invalidates it.
  const lookupKey = `${bank}:${accountNumber}`;
  const resolved = lookup?.key === lookupKey ? lookup.name : null;
  useEffect(() => {
    if (accountNumber.length !== 10) return;
    const t = window.setTimeout(() => setLookup({ key: lookupKey, name: businessName.toUpperCase() }), 700);
    return () => window.clearTimeout(t);
  }, [accountNumber.length, lookupKey, businessName]);

  const error =
    type === 'bank'
      ? accountNumber.length !== 10
        ? 'Enter the 10-digit account number.'
        : !resolved
          ? 'Checking the account…'
          : null
      : !validAddress(network, address.trim())
        ? network === 'TRON'
          ? 'A TRON address starts with T and is 34 characters.'
          : 'Enter a 0x… address, 42 characters.'
        : null;

  const submit = () => {
    setTouched(true);
    if (error) return;
    const id = `dst_${Math.random().toString(36).slice(2, 10)}`;
    onAdd(
      type === 'bank'
        ? { id, type: 'bank', currency: 'NGN', label: label.trim() || bank, bankName: bank, accountNumber, accountName: resolved! }
        : { id, type: 'crypto', currency: 'USDT', label: label.trim() || `${network} wallet`, network, address: address.trim() }
    );
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add payout account"
      description="Withdrawals can only go to accounts saved here."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            Save account
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Segmented
          label="Account type"
          value={type}
          onChange={(v) => {
            setType(v);
            setTouched(false);
          }}
          className="w-full"
          options={[
            { value: 'bank', label: 'Bank account (NGN)' },
            { value: 'crypto', label: 'Crypto wallet (USDT)' },
          ]}
        />

        {type === 'bank' ? (
          <>
            <Field label="Bank" htmlFor="acct-bank">
              <select id="acct-bank" value={bank} onChange={(e) => setBank(e.target.value)} className={cx(inputClass, 'cursor-pointer')}>
                {BANKS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Account number"
              htmlFor="acct-number"
              error={touched && error && error !== 'Checking the account…' ? error : undefined}
            >
              <input
                id="acct-number"
                inputMode="numeric"
                autoComplete="off"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="0123456789"
                className={cx(inputClass, 'font-mono')}
              />
            </Field>
            {accountNumber.length === 10 && (
              <p className="flex items-center gap-2 text-sm -mt-2">
                {resolved ? (
                  <span className="text-positive font-medium">{resolved}</span>
                ) : (
                  <>
                    <Loader2 className="size-4 animate-spin text-ink-3" />
                    <span className="text-ink-3">Checking account name…</span>
                  </>
                )}
              </p>
            )}
          </>
        ) : (
          <>
            <Field label="Network" htmlFor="acct-network" hint="Sending on the wrong network loses the funds — double-check.">
              <select
                id="acct-network"
                value={network}
                onChange={(e) => setNetwork(e.target.value as CryptoNetwork)}
                className={cx(inputClass, 'cursor-pointer')}
              >
                {NETWORKS.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Wallet address" htmlFor="acct-address" error={touched && error ? error : undefined}>
              <input
                id="acct-address"
                autoComplete="off"
                spellCheck={false}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={network === 'TRON' ? 'T…' : '0x…'}
                className={cx(inputClass, 'font-mono text-[13px]')}
              />
            </Field>
          </>
        )}

        <Field label="Nickname" htmlFor="acct-label" hint="Optional — helps you tell accounts apart.">
          <input
            id="acct-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={type === 'bank' ? 'Main account' : 'Treasury wallet'}
            className={inputClass}
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function WithdrawalsPage({
  data,
  store,
  canWithdraw,
  canManage,
  onWithdraw,
  onOpenTxn,
  notify,
  embedded = false,
}: {
  /** Shown as Settings → Payouts: no page header. */
  embedded?: boolean;
  data: ConsoleData;
  store: ConsoleActions;
  canWithdraw: boolean;
  canManage: boolean;
  onWithdraw: (c: Currency) => void;
  onOpenTxn: (id: string) => void;
  notify: (message: string) => void;
}) {
  const [editing, setEditing] = useState<PayoutRule | null>(null);
  const [adding, setAdding] = useState(false);

  const withdrawals = data.transactions.filter((t) => t.kind === 'withdrawal').slice(0, 12);
  const usedBy = (id: string) => (['NGN', 'USDT'] as const).filter((c) => data.rules[c].mode !== 'manual' && data.rules[c].destinationId === id);
  const businessName = data.destinations.find((d) => d.type === 'bank')?.accountName ?? 'Your business';

  return (
    <>
{!embedded && (
      <PageHeader
        title="Withdrawals"
        description="Move money out of Fluxel, by hand or on autopilot."
        actions={
          canWithdraw && (
            <Button variant="primary" onClick={() => onWithdraw('NGN')}>
              <ArrowUpRight className="size-4" />
              Withdraw
            </Button>
          )
        }
      />
      )}

      <Card>
        <CardHeader title="Payout settings" description="How each balance gets to your account." />
        <ul className="border-t border-line divide-y divide-line">
          {(['NGN', 'USDT'] as const).map((c) => {
            const rule = data.rules[c];
            const dest = data.destinations.find((d) => d.id === rule.destinationId);
            const next = nextScheduledRun(rule);
            return (
              <li key={c} className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <CurrencyIcon currency={c} className="size-9 shrink-0" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                      {c === 'NGN' ? 'Naira balance' : 'USDT balance'}
                      <Tag tone={rule.mode === 'manual' ? 'neutral' : 'brand'}>{MODE_LABEL[rule.mode]}</Tag>
                    </p>
                    <p className="mt-0.5 text-sm text-ink-2">
                      {describeRule(rule)}
                      {rule.mode !== 'manual' && dest && <> → {destinationSummary(dest)}</>}
                    </p>
                    {next && <p className="text-xs text-ink-3 mt-0.5">Next: {formatNextRun(next)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0 pl-12 sm:pl-0">
                  <Money amount={data.balances[c]} currency={c} className="text-sm text-ink-2 mr-2" />
                  {canManage && (
                    <Button size="sm" onClick={() => setEditing(rule)}>
                      Change
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Payout accounts"
          description="Bank accounts and wallets you can withdraw to."
          actions={
            canManage && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="size-4" />
                Add account
              </Button>
            )
          }
        />
        {data.destinations.length === 0 ? (
          <EmptyState title="No payout accounts yet" description="Add a bank account or wallet to start withdrawing." />
        ) : (
          <ul className="border-t border-line divide-y divide-line">
            {data.destinations.map((d) => {
              const rules = usedBy(d.id);
              return (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                  <DestinationIcon d={d} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                      {d.label}
                      {rules.length > 0 && <Tag>Used for {rules.join(' & ')} payouts</Tag>}
                    </p>
                    <p className="text-xs text-ink-3 truncate">
                      {d.type === 'bank' ? `${d.accountName} · ${destinationSummary(d)}` : destinationSummary(d)}
                    </p>
                  </div>
                  <span className="hidden sm:inline text-xs text-ink-3">{d.currency}</span>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={rules.length > 0}
                      title={rules.length > 0 ? 'Change the payout setting that uses this account first' : undefined}
                      onClick={() => {
                        store.removeDestination(d.id);
                        notify(`${d.label} removed`);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Recent withdrawals" />
        {withdrawals.length === 0 ? (
          <EmptyState title="No withdrawals yet" />
        ) : (
          <ul className="border-t border-line divide-y divide-line">
            {withdrawals.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onOpenTxn(t.id)}
                  className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-subtle cursor-pointer transition-colors"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{txnTitle(t, data)}</span>
                    <span className="block text-xs text-ink-3">
                      {formatWhen(t.createdAt)} · {t.trigger ? MODE_LABEL[t.trigger] : 'Manual'}
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <StatusBadge status={t.status} />
                  </span>
                  <span className="text-right">
                    <Money amount={-t.amount} currency={t.currency} className="block text-sm text-ink" />
                    {t.converted && (
                      <span className="block text-xs text-ink-3">
                        → {formatMoney(t.converted.amount, t.converted.currency)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <RuleModal
        rule={editing}
        data={data}
        onClose={() => setEditing(null)}
        onSave={(rule) => {
          store.updateRule(rule);
          notify(`${rule.currency} payouts set to ${MODE_LABEL[rule.mode].toLowerCase()}`);
        }}
        />
      )}

      {adding && (
        <AddAccountModal
        businessName={businessName}
        onClose={() => setAdding(false)}
        onAdd={(d) => {
          store.addDestination(d);
          notify(`${d.label} added`);
        }}
        />
      )}
    </>
  );
}
