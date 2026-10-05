'use client';

import React, { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';

import { DAY_MS, formatDateTime, formatMoney, startOfDay, toNgn } from '../../lib/console/format';
import { useNow } from '../../lib/console/useNow';
import type { Transaction } from '../../lib/console/types';
import BarChart from './BarChart';
import { downloadCsv, type PageProps } from './nav';
import { Button, Card, CardHeader, PageHeader, Segmented, StatStrip } from './ui';
import { txnTitle } from './txn';

type Range = '7' | '30' | '90';

const sourceOf = (t: Transaction) =>
  t.linkId ? 'Payment links' : t.invoiceId ? 'Invoices' : t.subscriptionId ? 'Subscriptions' : 'Checkout & API';

/** A ranked list of shares — one colour, labelled, so no legend is needed. */
function BarList({ rows }: { rows: { label: string; value: number; count: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <ul className="space-y-4 px-5 pb-5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">{r.label}</span>
            <span className="tabular-nums text-ink">
              {formatMoney(r.value, 'NGN', { compact: true })}
              <span className="ml-2 text-xs text-ink-3">{Math.round((r.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-subtle overflow-hidden">
            <div className="h-full rounded-full bg-chart" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink-3">{r.count.toLocaleString()} payments</p>
        </li>
      ))}
    </ul>
  );
}

export default function ReportsPage({ data, notify }: PageProps) {
  const [range, setRange] = useState<Range>('30');
  const now = useNow();

  const report = useMemo(() => {
    const days = Number(range);
    const from = startOfDay(now) - (days - 1) * DAY_MS;
    const payments = data.transactions.filter((t) => t.kind === 'payment' && t.createdAt >= from);
    const ok = payments.filter((t) => t.status === 'successful');
    const failed = payments.filter((t) => t.status === 'failed');
    const gross = ok.reduce((s, t) => s + toNgn(t.amount, t.currency), 0);
    const fees = ok.reduce((s, t) => s + toNgn(t.fee, t.currency), 0);
    const refunded = data.refunds
      .filter((r) => r.createdAt >= from && r.status !== 'failed')
      .reduce((s, r) => s + toNgn(r.amount, r.currency), 0);

    const daily = Array.from({ length: days }, (_, i) => ({ t: from + i * DAY_MS, v: 0, count: 0 }));
    for (const t of ok) {
      const i = Math.floor((startOfDay(t.createdAt) - from) / DAY_MS);
      if (daily[i]) {
        daily[i].v += toNgn(t.amount, t.currency);
        daily[i].count++;
      }
    }

    const group = (key: (t: Transaction) => string) => {
      const m = new Map<string, { value: number; count: number }>();
      for (const t of ok) {
        const k = key(t);
        const g = m.get(k) ?? { value: 0, count: 0 };
        g.value += toNgn(t.amount, t.currency);
        g.count++;
        m.set(k, g);
      }
      return [...m.entries()].map(([label, g]) => ({ label, ...g })).sort((a, b) => b.value - a.value);
    };

    return {
      gross,
      net: gross - fees - refunded,
      fees,
      refunded,
      count: ok.length,
      average: ok.length ? gross / ok.length : 0,
      successRate: ok.length + failed.length ? (ok.length / (ok.length + failed.length)) * 100 : 100,
      daily,
      byChannel: group((t) => (t.currency === 'NGN' ? 'Bank transfer (NGN)' : t.method.replace('·', '—'))),
      bySource: group(sourceOf),
    };
  }, [data.transactions, data.refunds, range, now]);

  // Last three calendar months, each downloadable as a statement.
  const months = useMemo(() => {
    const d = new Date(now);
    return Array.from({ length: 3 }, (_, i) => {
      const startM = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime();
      const endM = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime();
      const txns = data.transactions.filter((t) => t.createdAt >= startM && t.createdAt < endM && t.status !== 'failed');
      const label = new Date(startM).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      return { label, startM, txns, partial: i === 0 };
    });
  }, [data.transactions, now]);

  const statement = (m: (typeof months)[number]) => {
    downloadCsv(`fluxel-statement-${m.label.toLowerCase().replace(' ', '-')}.csv`, [
      ['Date', 'Reference', 'Type', 'Description', 'Currency', 'Amount', 'Fee', 'Net', 'Status'],
      ...m.txns
        .slice()
        .reverse()
        .map((t) => [
          formatDateTime(t.createdAt),
          t.reference,
          t.kind,
          txnTitle(t, data),
          t.currency,
          (t.kind === 'payment' ? t.amount : -t.amount).toFixed(2),
          t.fee.toFixed(2),
          (t.kind === 'payment' ? t.amount - t.fee : -(t.amount + t.fee)).toFixed(2),
          t.status,
        ]),
    ]);
    notify(`${m.label} statement downloaded`);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="How your business is performing. USDT is converted to naira at the demo rate."
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

      <StatStrip
        items={[
          { label: 'Gross volume', value: formatMoney(report.gross, 'NGN', { compact: true }), hint: `${report.count.toLocaleString()} payments` },
          { label: 'Net revenue', value: formatMoney(report.net, 'NGN', { compact: true }), hint: 'After fees and refunds' },
          { label: 'Success rate', value: `${report.successRate.toFixed(1)}%`, hint: 'Of attempted payments' },
          { label: 'Average payment', value: formatMoney(report.average, 'NGN', { compact: true }) },
        ]}
      />

      <Card>
        <CardHeader title="Money in per day" description={`Successful payments, last ${range} days`} />
        <div className="px-3 sm:px-5 pb-5">
          <BarChart points={report.daily} currency="NGN" label="Money received per day" />
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="By payment method" />
          <BarList rows={report.byChannel} />
        </Card>
        <Card>
          <CardHeader title="By source" />
          <BarList rows={report.bySource} />
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Fees and deductions" description={`Last ${range} days`} />
        <dl className="border-t border-line divide-y divide-line text-sm">
          {[
            ['Gross volume', report.gross],
            ['Fluxel fees', -report.fees],
            ['Refunds', -report.refunded],
          ].map(([label, v]) => (
            <div key={label as string} className="flex justify-between px-5 py-3">
              <dt className="text-ink-2">{label}</dt>
              <dd className="tabular-nums text-ink">{formatMoney(v as number, 'NGN')}</dd>
            </div>
          ))}
          <div className="flex justify-between px-5 py-3 font-semibold">
            <dt className="text-ink">Net revenue</dt>
            <dd className="tabular-nums text-ink">{formatMoney(report.net, 'NGN')}</dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Statements" description="Every transaction in the month, as CSV — for your accountant." />
        <ul className="border-t border-line divide-y divide-line">
          {months.map((m) => (
            <li key={m.label} className="flex items-center gap-3 px-5 py-3.5">
              <span className="size-9 shrink-0 inline-flex items-center justify-center rounded-lg bg-gold-soft text-gold border border-brand/40">
                <FileText className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{m.label}</span>
                <span className="block text-xs text-ink-3">
                  {m.txns.length.toLocaleString()} transactions{m.partial ? ' · month to date' : ''}
                </span>
              </span>
              <Button size="sm" onClick={() => statement(m)} disabled={m.txns.length === 0}>
                <Download className="size-4" />
                CSV
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
