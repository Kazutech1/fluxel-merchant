'use client';

import React, { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';

import { useCryptoEnabled } from '../../lib/features';
import { useAssets, useCustomers, useSettlementSummary, useTransactions } from '../../lib/console/data';
import { DAY_MS, formatDateTime, startOfDay } from '../../lib/console/format';
import { decimalsFor, toMajor } from '../../lib/console/money';
import type { AssetTotal } from '../../lib/console/models';
import { useNow } from '../../lib/console/useNow';
import BarChart from './BarChart';
import CurrencyIcon from './CurrencyIcon';
import { DIRECTION_LABEL, downloadCsv, type PageProps } from './nav';
import { Button, Card, CardHeader, EmptyState, ErrorState, LoadingRows, Money, PageHeader, Segmented, Skeleton } from './ui';
import { txnTitle } from './txn';

type Range = '7' | '30' | '90';

function Totals({ title, rows, assets, negative }: { title: string; rows: AssetTotal[]; assets?: Parameters<typeof decimalsFor>[1]; negative?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} />
      <div className="border-t border-line">
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-3">None in this period.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.asset_code} className="flex items-center gap-3 px-5 py-3">
                <CurrencyIcon asset={r.asset_code} className="size-7" />
                <span className="flex-1 text-sm text-ink">{r.asset_code}</span>
                <Money minor={r.total} asset={r.asset_code} assets={assets} negative={negative} className="text-sm font-medium text-ink" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export default function ReportsPage({ notify }: PageProps) {
  const [range, setRange] = useState<Range>('30');
  const now = useNow(5 * 60_000);
  const days = Number(range);
  const start = startOfDay(now) - (days - 1) * DAY_MS;
  const from = useMemo(() => new Date(start).toISOString(), [start]);
  const to = useMemo(() => new Date(startOfDay(now) + DAY_MS).toISOString(), [now]);

  const summary = useSettlementSummary(from, to);
  const txns = useTransactions();
  const cryptoOn = useCryptoEnabled();
  const { data: assets } = useAssets();
  const { data: customers } = useCustomers();
  const ngnDecimals = decimalsFor('NGN', assets);

  const daily = useMemo(() => {
    const out = Array.from({ length: days }, (_, i) => ({ t: start + i * DAY_MS, v: 0, count: 0 }));
    for (const t of txns.data ?? []) {
      if (t.direction !== 'in' || t.asset_code !== 'NGN' || t.status === 'failed') continue;
      const i = Math.floor((startOfDay(Date.parse(t.created_at ?? '')) - start) / DAY_MS);
      if (out[i]) {
        out[i].v += toMajor(t.amount, ngnDecimals);
        out[i].count++;
      }
    }
    return out;
  }, [txns.data, days, start, ngnDecimals]);

  const months = useMemo(() => {
    const d = new Date(now);
    return Array.from({ length: 3 }, (_, i) => {
      const s = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime();
      const e = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime();
      const rows = (txns.data ?? []).filter((t) => {
        const ms = Date.parse(t.created_at ?? '');
        return ms >= s && ms < e;
      });
      return { label: new Date(s).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), rows, partial: i === 0 };
    });
  }, [txns.data, now]);

  const statement = (m: (typeof months)[number]) => {
    downloadCsv(`fluxel-statement-${m.label.toLowerCase().replace(' ', '-')}.csv`, [
      ['Date', 'ID', 'Type', 'Description', 'Asset', 'Amount', 'Fee', 'Status', 'Bank reference', ...(cryptoOn ? ['Blockchain hash'] : [])],
      ...m.rows
        .slice()
        .reverse()
        .map((t) => {
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
    notify(`${m.label} statement downloaded`);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Settled totals by asset, straight from your Fluxel ledger."
        actions={
          <Segmented<Range>
            label="Range"
            value={range}
            onChange={setRange}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
            ]}
          />
        }
      />

      {summary.loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-8 w-full" />
            </Card>
          ))}
        </div>
      ) : summary.error ? (
        <Card>
          <ErrorState message={summary.error.message} onRetry={summary.reload} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Totals title="Received" rows={summary.data?.deposits ?? []} assets={assets} />
          <Totals title="Paid out" rows={summary.data?.payouts ?? []} assets={assets} negative />
          <Totals title="Transferred between customers" rows={summary.data?.transfers ?? []} assets={assets} />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title="Naira received per day" description={`Last ${range} days`} />
        <div className="px-3 sm:px-5 pb-5">
          {txns.loading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : daily.some((d) => d.count) ? (
            <BarChart points={daily} currency="NGN" label="Naira received per day" />
          ) : (
            <div className="h-[220px] flex items-center justify-center rounded-lg border border-dashed border-line text-sm text-ink-3">
              No naira deposits in this period.
            </div>
          )}
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Statements" description="Every transaction in the month, as CSV — for your accountant." />
        <div className="border-t border-line">
          {txns.loading ? (
            <LoadingRows rows={3} />
          ) : txns.error ? (
            <ErrorState message={txns.error.message} onRetry={txns.reload} />
          ) : months.every((m) => m.rows.length === 0) ? (
            <EmptyState title="Nothing to export yet" description="Statements fill in as money moves." />
          ) : (
            <ul className="divide-y divide-line">
              {months.map((m) => (
                <li key={m.label} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="size-9 shrink-0 inline-flex items-center justify-center rounded-lg bg-gold-soft text-gold border border-brand/40">
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{m.label}</span>
                    <span className="block text-xs text-ink-3">
                      {m.rows.length} transactions{m.partial ? ' · month to date' : ''}
                    </span>
                  </span>
                  <Button size="sm" onClick={() => statement(m)} disabled={m.rows.length === 0}>
                    <Download className="size-4" />
                    CSV
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
