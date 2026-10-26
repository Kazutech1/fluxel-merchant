'use client';

import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';

import { useCryptoEnabled } from '../../lib/features';
import { useAssets, useCustomers, useTransactions } from '../../lib/console/data';
import { formatDateTime, formatWhen, titleCase } from '../../lib/console/format';
import { decimalsFor, toMajor } from '../../lib/console/money';
import type { Txn } from '../../lib/console/models';
import { DIRECTION_LABEL, downloadCsv, type PageProps } from './nav';
import { Button, Card, EmptyState, ErrorState, LoadingRows, Money, PageHeader, Segmented, StatusBadge, controlClass, cx } from './ui';
import { DirectionIcon, txnMethod, txnTitle } from './txn';

const PAGE_SIZE = 25;
type Direction = 'all' | Txn['direction'];
const selectClass = cx(controlClass, 'h-10 !w-auto pr-8 cursor-pointer');

export default function TransactionsPage({ onOpenTxn }: PageProps) {
  const txns = useTransactions();
  const { data: customers } = useCustomers();
  const cryptoOn = useCryptoEnabled();
  const { data: assets } = useAssets();
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<Direction>('all');
  const [asset, setAsset] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);

  const all = useMemo(() => txns.data ?? [], [txns.data]);
  const assetOptions = useMemo(() => [...new Set(all.map((t) => t.asset_code))].sort(), [all]);
  const statusOptions = useMemo(() => [...new Set(all.map((t) => t.status))].sort(), [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((t) => {
      if (direction !== 'all' && t.direction !== direction) return false;
      if (asset !== 'all' && t.asset_code !== asset) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (!q) return true;
      return [t.id, t.provider_ref, t.txid, txnTitle(t, customers)].some((v) => v?.toLowerCase().includes(q));
    });
  }, [all, query, direction, asset, status, customers]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const filtering = Boolean(query) || direction !== 'all' || asset !== 'all' || status !== 'all';
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  const exportCsv = () =>
    downloadCsv(`fluxel-transactions-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Date', 'ID', 'Type', 'Description', 'Asset', 'Amount', 'Fee', 'Status', 'Bank reference', ...(cryptoOn ? ['Blockchain hash'] : [])],
      ...filtered.map((t) => {
        const d = decimalsFor(t.asset_code, assets);
        return [
          formatDateTime(t.created_at),
          t.id,
          DIRECTION_LABEL[t.direction],
          txnTitle(t, customers),
          t.asset_code,
          (t.direction === 'out' ? -1 : 1) * toMajor(t.amount, d),
          toMajor(t.fee, d),
          t.status,
          t.provider_ref ?? '',
          ...(cryptoOn ? [t.txid ?? ''] : []),
        ];
      }),
    ]);

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Deposits in, payouts out and transfers between your customers. Latest 100 of each."
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
            onChange={(e) => reset(setQuery)(e.target.value)}
            placeholder="Search ID, bank reference, hash or customer"
            aria-label="Search transactions"
            className={cx(controlClass, 'h-10 !pl-10')}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented<Direction>
            label="Type"
            value={direction}
            onChange={reset(setDirection)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'in', label: 'In' },
              { value: 'out', label: 'Out' },
              { value: 'transfer', label: 'Transfers' },
            ]}
          />
          <select aria-label="Asset" value={asset} onChange={(e) => reset(setAsset)(e.target.value)} className={selectClass}>
            <option value="all">All assets</option>
            {assetOptions.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select aria-label="Status" value={status} onChange={(e) => reset(setStatus)(e.target.value)} className={selectClass}>
            <option value="all">Any status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {txns.loading ? (
          <LoadingRows rows={8} />
        ) : txns.error ? (
          <ErrorState message={txns.error.message} onRetry={txns.reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={filtering ? 'No transactions match' : 'No transactions yet'}
            description={filtering ? 'Try a different search or clear the filters.' : 'They appear here as soon as money moves.'}
          />
        ) : (
          <>
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
                  <tr key={`${t.direction}:${t.id}`} onClick={() => onOpenTxn(t)} className="hover:bg-subtle cursor-pointer transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <DirectionIcon direction={t.direction} />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTxn(t);
                            }}
                            className="block font-medium text-ink truncate max-w-[18rem] text-left cursor-pointer hover:underline underline-offset-4"
                          >
                            {txnTitle(t, customers)}
                          </button>
                          <span className="block text-xs text-ink-3 font-mono truncate max-w-[18rem]">{t.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-2">{txnMethod(t)}</td>
                    <td className="px-5 py-3 text-ink-2 whitespace-nowrap">{formatWhen(t.created_at)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Money
                        minor={t.amount}
                        asset={t.asset_code}
                        assets={assets}
                        sign={t.direction !== 'transfer'}
                        negative={t.direction === 'out'}
                        className={t.status === 'failed' ? 'text-ink-3 line-through' : 'text-ink'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="md:hidden divide-y divide-line">
              {rows.map((t) => (
                <li key={`${t.direction}:${t.id}`}>
                  <button type="button" onClick={() => onOpenTxn(t)} className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer">
                    <DirectionIcon direction={t.direction} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink truncate">{txnTitle(t, customers)}</span>
                      <span className="block text-xs text-ink-3">{formatWhen(t.created_at)}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <Money
                        minor={t.amount}
                        asset={t.asset_code}
                        assets={assets}
                        sign={t.direction !== 'transfer'}
                        negative={t.direction === 'out'}
                        className="block text-sm text-ink"
                      />
                      <StatusBadge status={t.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-line text-sm text-ink-3">
              <span>
                {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
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
