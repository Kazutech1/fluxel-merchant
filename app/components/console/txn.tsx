'use client';

import React from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { destinationSummary, formatWhen } from '../../lib/console/format';
import type { ConsoleData, Transaction } from '../../lib/console/types';
import { Money, StatusBadge, cx } from './ui';

/** Who the money came from or went to, in a few words. */
export function txnTitle(txn: Transaction, data: ConsoleData): string {
  if (txn.kind === 'payment') {
    return data.customers.find((c) => c.id === txn.customerId)?.name ?? 'Customer payment';
  }
  const dest = data.destinations.find((d) => d.id === txn.destinationId);
  return dest ? `To ${destinationSummary(dest)}` : txn.narration;
}

/** Money in adds to the balance; failed payments never did. */
export function signedAmount(txn: Transaction): number {
  return txn.kind === 'payment' ? txn.amount : -txn.amount;
}

export function DirectionIcon({ txn }: { txn: Transaction }) {
  const inbound = txn.kind === 'payment';
  return (
    <span
      aria-hidden
      className={cx(
        'size-9 shrink-0 inline-flex items-center justify-center rounded-full border',
        inbound ? 'border-line bg-subtle text-ink' : 'border-line bg-surface text-ink-3'
      )}
    >
      {inbound ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
    </span>
  );
}

/** Compact two-line row used in the overview and customer drawer. */
export function TxnListItem({
  txn,
  data,
  onOpen,
}: {
  txn: Transaction;
  data: ConsoleData;
  onOpen: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(txn.id)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-subtle transition-colors cursor-pointer"
      >
        <DirectionIcon txn={txn} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink truncate">{txnTitle(txn, data)}</span>
          <span className="block text-xs text-ink-3 truncate">
            {formatWhen(txn.createdAt)} · {txn.method}
          </span>
        </span>
        <span className="text-right shrink-0">
          <Money
            amount={signedAmount(txn)}
            currency={txn.currency}
            sign
            className={cx('block text-sm', txn.status === 'failed' ? 'text-ink-3 line-through' : 'text-ink')}
          />
          {txn.status !== 'successful' && (
            <span className="block mt-0.5">
              <StatusBadge status={txn.status} />
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
