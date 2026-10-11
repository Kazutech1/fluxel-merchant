'use client';

import React from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react';

import { formatWhen } from '../../lib/console/format';
import type { Asset, Customer, Txn } from '../../lib/console/models';
import { DIRECTION_LABEL } from './nav';
import { Money, StatusBadge, cx } from './ui';

export function customerLabel(id: string | null | undefined, customers?: Customer[]): string {
  if (!id) return 'Your business';
  return customers?.find((c) => c.id === id)?.external_id ?? id;
}

/** "From amina@…" for deposits, "To GTBank" style is unavailable — the API doesn't return payout destinations in lists. */
export function txnTitle(t: Txn, customers?: Customer[]): string {
  if (t.direction === 'transfer') return `${customerLabel(t.customer_id, customers)} → ${customerLabel(t.to_customer_id, customers)}`;
  if (t.direction === 'out') return t.customer_id ? `Payout · ${customerLabel(t.customer_id, customers)}` : 'Payout to bank';
  return customerLabel(t.customer_id, customers);
}

export function txnMethod(t: Txn): string {
  if (t.kind === 'crypto') return `${t.asset_code} · on-chain`;
  if (t.kind === 'transfer') return `${t.asset_code} · internal`;
  return t.direction === 'out' ? 'Bank payout' : 'Bank transfer';
}

export function DirectionIcon({ direction }: { direction: Txn['direction'] }) {
  const Icon = direction === 'in' ? ArrowDownLeft : direction === 'out' ? ArrowUpRight : ArrowLeftRight;
  return (
    <span
      aria-label={DIRECTION_LABEL[direction]}
      className={cx(
        'size-9 shrink-0 inline-flex items-center justify-center rounded-full border border-line',
        direction === 'in' ? 'bg-gold-soft text-gold' : 'bg-surface text-ink-3'
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

/** Compact two-line row, for the overview and drawers. */
export function TxnListItem({
  txn,
  customers,
  assets,
  onOpen,
}: {
  txn: Txn;
  customers?: Customer[];
  assets?: Asset[];
  onOpen: (txn: Txn) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(txn)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-subtle transition-colors cursor-pointer"
      >
        <DirectionIcon direction={txn.direction} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink truncate">{txnTitle(txn, customers)}</span>
          <span className="block text-xs text-ink-3 truncate">
            {formatWhen(txn.created_at)} · {txnMethod(txn)}
          </span>
        </span>
        <span className="text-right shrink-0">
          <Money
            minor={txn.amount}
            asset={txn.asset_code}
            assets={assets}
            sign={txn.direction !== 'transfer'}
            negative={txn.direction === 'out'}
            className={cx('block text-sm', txn.status === 'failed' ? 'text-ink-3 line-through' : 'text-ink')}
          />
          <span className="block mt-0.5">
            <StatusBadge status={txn.status} />
          </span>
        </span>
      </button>
    </li>
  );
}
