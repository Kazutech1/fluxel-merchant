'use client';

import React, { useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';

import { REFUND_REASONS } from '../../lib/console/demoData';
import { DAY_MS, formatMoney, formatWhen, toNgn } from '../../lib/console/format';
import { useNow } from '../../lib/console/useNow';
import type { ConsoleData, Transaction } from '../../lib/console/types';
import { REFUND_STATUS, canMoveMoney, type PageProps } from './nav';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  Money,
  PageHeader,
  Pill,
  Segmented,
  StatStrip,
  cx,
  controlClass,
  inputClass,
  selectClass,
} from './ui';
import { DirectionIcon, txnTitle } from './txn';

export function refundableLeft(t: Transaction): number {
  return Math.round((t.amount - (t.refunded ?? 0)) * 100) / 100;
}

export function canRefund(t: Transaction): boolean {
  return t.kind === 'payment' && t.status === 'successful' && refundableLeft(t) > 0 && !t.disputeId;
}

export function RefundModal({
  txn,
  data,
  onClose,
  onRefund,
}: {
  txn: Transaction;
  data: ConsoleData;
  onClose: () => void;
  onRefund: (txnId: string, amount: number, reason: string) => string | null;
}) {
  const left = refundableLeft(txn);
  const [kind, setKind] = useState<'full' | 'partial'>('full');
  const [amountText, setAmountText] = useState('');
  const [reason, setReason] = useState(REFUND_REASONS[0]);
  const [error, setError] = useState<string | null>(null);
  const amount = kind === 'full' ? left : Number(amountText) || 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Refund payment"
      description={`${txnTitle(txn, data)} · ${txn.reference}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const err = onRefund(txn.id, amount, reason);
              if (err) setError(err);
              else onClose();
            }}
          >
            <RotateCcw className="size-4" />
            Refund {formatMoney(amount, txn.currency)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-subtle border border-line px-4 py-3 text-sm flex justify-between">
          <span className="text-ink-2">Available to refund</span>
          <Money amount={left} currency={txn.currency} className="font-medium text-ink" />
        </div>
        <Segmented
          label="Refund type"
          value={kind}
          onChange={(v) => {
            setKind(v);
            setError(null);
          }}
          className="w-full"
          options={[
            { value: 'full', label: 'Full refund' },
            { value: 'partial', label: 'Partial refund' },
          ]}
        />
        {kind === 'partial' && (
          <Field label="Amount" htmlFor="refund-amount">
            <div className="relative">
              <input
                id="refund-amount"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => {
                  setAmountText(e.target.value.replace(/[^\d.]/g, ''));
                  setError(null);
                }}
                placeholder="0.00"
                className={cx(inputClass, '!pr-16 font-mono')}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3">{txn.currency}</span>
            </div>
          </Field>
        )}
        <Field label="Reason" htmlFor="refund-reason">
          <select id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={selectClass}>
            {REFUND_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <p className="text-sm text-ink-3">
          The money comes out of your {txn.currency} balance and reaches the customer within minutes. Fluxel’s fee on the
          original payment isn’t returned.
        </p>
        {error && <p className="text-sm text-negative">{error}</p>}
      </div>
    </Modal>
  );
}

function PickPaymentModal({ data, onClose, onPick }: { data: ConsoleData; onClose: () => void; onPick: (t: Transaction) => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const options = data.transactions
    .filter(canRefund)
    .filter((t) => !q || t.reference.toLowerCase().includes(q) || txnTitle(t, data).toLowerCase().includes(q))
    .slice(0, 30);
  return (
    <Modal open onClose={onClose} title="Which payment?" description="Search by customer name or reference.">
      <div className="relative mb-3">
        <Search aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Amina Bello or FLX-…"
          aria-label="Search payments"
          className={cx(controlClass, 'h-11 !pl-10')}
        />
      </div>
      <ul className="-mx-6 border-y border-line divide-y divide-line max-h-[50svh] overflow-y-auto">
        {options.length === 0 && <li className="px-6 py-6 text-sm text-ink-3 text-center">No refundable payments match.</li>}
        {options.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => onPick(t)} className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-subtle cursor-pointer">
              <DirectionIcon txn={t} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink truncate">{txnTitle(t, data)}</span>
                <span className="block text-xs text-ink-3">
                  {t.reference} · {formatWhen(t.createdAt)}
                </span>
              </span>
              <Money amount={t.amount} currency={t.currency} className="text-sm text-ink" />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export default function RefundsPage({ data, store, role, notify, onOpenTxn }: PageProps) {
  const [picking, setPicking] = useState(false);
  const [target, setTarget] = useState<Transaction | null>(null);
  const now = useNow();
  const manage = canMoveMoney(role);

  const stats = useMemo(() => {
    const since = now - 30 * DAY_MS;
    const recent = data.refunds.filter((r) => r.createdAt >= since && r.status !== 'failed');
    const refunded = recent.reduce((s, r) => s + toNgn(r.amount, r.currency), 0);
    const received = data.transactions
      .filter((t) => t.kind === 'payment' && t.status === 'successful' && t.createdAt >= since)
      .reduce((s, t) => s + toNgn(t.amount, t.currency), 0);
    return { refunded, count: recent.length, rate: received ? (refunded / received) * 100 : 0 };
  }, [data.refunds, data.transactions, now]);

  return (
    <>
      <PageHeader
        title="Refunds"
        description="Money you’ve sent back to customers."
        actions={
          manage && (
            <Button variant="primary" onClick={() => setPicking(true)}>
              <RotateCcw className="size-4" />
              Refund a payment
            </Button>
          )
        }
      />

      <StatStrip
        items={[
          { label: 'Refunded · 30 days', value: formatMoney(stats.refunded, 'NGN', { compact: true }) },
          { label: 'Refunds · 30 days', value: stats.count },
          { label: 'Refund rate', value: `${stats.rate.toFixed(2)}%`, hint: 'Of money received in 30 days' },
        ]}
      />

      <Card className="overflow-hidden">
        {data.refunds.length === 0 ? (
          <EmptyState title="No refunds yet" />
        ) : (
          <table className="w-full text-sm">
            <thead className="hidden md:table-header-group">
              <tr className="text-left text-xs text-ink-3 border-b border-line">
                <th className="font-medium px-5 py-3">Customer</th>
                <th className="font-medium px-5 py-3">Reason</th>
                <th className="font-medium px-5 py-3">Status</th>
                <th className="font-medium px-5 py-3">Date</th>
                <th className="font-medium px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.refunds.map((r) => {
                const txn = data.transactions.find((t) => t.id === r.txnId);
                const st = REFUND_STATUS[r.status];
                return (
                  <tr key={r.id} onClick={() => txn && onOpenTxn(txn.id)} className="hover:bg-subtle cursor-pointer transition-colors">
                    <td className="px-5 py-3">
                      <span className="block font-medium text-ink">{txn ? txnTitle(txn, data) : '—'}</span>
                      <span className="block text-xs text-ink-3 font-mono">
                        {r.reference} · for {txn?.reference}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-5 py-3 text-ink-2">
                      {r.reason}
                      <span className="block text-xs text-ink-3">by {r.initiatedBy}</span>
                    </td>
                    <td className="hidden md:table-cell px-5 py-3">
                      <Pill tone={st.tone} pulse={r.status === 'processing'}>
                        {st.label}
                      </Pill>
                    </td>
                    <td className="hidden md:table-cell px-5 py-3 text-ink-2 whitespace-nowrap">{formatWhen(r.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Money amount={-r.amount} currency={r.currency} className="text-ink" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {picking && (
        <PickPaymentModal
          data={data}
          onClose={() => setPicking(false)}
          onPick={(t) => {
            setPicking(false);
            setTarget(t);
          }}
        />
      )}
      {target && (
        <RefundModal
          txn={target}
          data={data}
          onClose={() => setTarget(null)}
          onRefund={(id, amount, reason) => {
            const err = store.refund(id, amount, reason);
            if (!err) notify(`Refund of ${formatMoney(amount, target.currency)} started`);
            return err;
          }}
        />
      )}
    </>
  );
}
