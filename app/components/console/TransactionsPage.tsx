'use client';

import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';

import { formatDateTime, formatWhen } from '../../lib/console/format';
import type { ConsoleData, Currency, TxnStatus } from '../../lib/console/types';
import { Button, Card, EmptyState, Money, PageHeader, Segmented, StatusBadge, controlClass, cx } from './ui';
import { DirectionIcon, signedAmount, txnTitle } from './txn';

const PAGE_SIZE = 20;

type Direction = 'all' | 'in' | 'out';

const selectClass = cx(controlClass, 'h-10 !w-auto pr-8 cursor-pointer');

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TransactionsPage({
  data,
  onOpenTxn,
}: {
  data: ConsoleData;
  onOpenTxn: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<Direction>('all');
  const [currency, setCurrency] = useState<'all' | Currency>('all');
  const [status, setStatus] = useState<'all' | TxnStatus>('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.transactions.filter((t) => {
      if (direction === 'in' && t.kind !== 'payment') return false;
      if (direction === 'out' && t.kind !== 'withdrawal') return false;
      if (currency !== 'all' && t.currency !== currency) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (!q) return true;
      return (
        t.reference.toLowerCase().includes(q) ||
        txnTitle(t, data).toLowerCase().includes(q) ||
        t.narration.toLowerCase().includes(q)
      );
    });
  }, [data, query, direction, currency, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  const exportCsv = () =>
    downloadCsv(`fluxel-transactions-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Date', 'Reference', 'Type', 'Description', 'Method', 'Currency', 'Amount', 'Fee', 'Status'],
      ...filtered.map((t) => [
        formatDateTime(t.createdAt),
        t.reference,
        t.kind === 'payment' ? 'Payment' : 'Withdrawal',
        txnTitle(t, data),
        t.method,
        t.currency,
        signedAmount(t).toFixed(2),
        t.fee.toFixed(2),
        t.status,
      ]),
    ]);

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every payment you've received and every withdrawal you've made."
        actions={
          <Button onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            placeholder="Search name or reference"
            aria-label="Search transactions"
            className={cx(controlClass, 'h-10 !pl-10')}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented<Direction>
            label="Direction"
            value={direction}
            onChange={resetPage(setDirection)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'in', label: 'Money in' },
              { value: 'out', label: 'Money out' },
            ]}
          />
          <select
            aria-label="Currency"
            value={currency}
            onChange={(e) => resetPage(setCurrency)(e.target.value as 'all' | Currency)}
            className={selectClass}
          >
            <option value="all">All currencies</option>
            <option value="NGN">NGN</option>
            <option value="USDT">USDT</option>
          </select>
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => resetPage(setStatus)(e.target.value as 'all' | TxnStatus)}
            className={selectClass}
          >
            <option value="all">Any status</option>
            <option value="successful">Successful</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No transactions match" description="Try a different search or clear the filters." />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-3 border-b border-line">
                  <th className="font-medium px-5 py-3">Description</th>
                  <th className="font-medium px-5 py-3">Method</th>
                  <th className="font-medium px-5 py-3">Date</th>
                  <th className="font-medium px-5 py-3">Status</th>
                  <th className="font-medium px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onOpenTxn(t.id)}
                    className="hover:bg-subtle cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <DirectionIcon txn={t} />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTxn(t.id);
                            }}
                            className="block font-medium text-ink truncate max-w-[16rem] text-left cursor-pointer hover:underline underline-offset-4"
                          >
                            {txnTitle(t, data)}
                          </button>
                          <span className="block text-xs text-ink-3 font-mono">{t.reference}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-2">{t.method}</td>
                    <td className="px-5 py-3 text-ink-2 whitespace-nowrap">{formatWhen(t.createdAt)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Money
                        amount={signedAmount(t)}
                        currency={t.currency}
                        sign
                        className={t.status === 'failed' ? 'text-ink-3 line-through' : 'text-ink'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <ul className="md:hidden divide-y divide-line">
              {rows.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTxn(t.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
                  >
                    <DirectionIcon txn={t} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink truncate">{txnTitle(t, data)}</span>
                      <span className="block text-xs text-ink-3">{formatWhen(t.createdAt)}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <Money
                        amount={signedAmount(t)}
                        currency={t.currency}
                        sign
                        className={cx('block text-sm', t.status === 'failed' ? 'text-ink-3 line-through' : 'text-ink')}
                      />
                      <StatusBadge status={t.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-line text-sm text-ink-3">
              <span>
                {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <Button size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
                  Previous
                </Button>
                <Button size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
