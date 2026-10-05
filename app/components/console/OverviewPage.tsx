'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

import {
  DAY_MS,
  describeRule,
  formatMoney,
  formatNextRun,
  nextScheduledRun,
  toNgn,
} from '../../lib/console/format';
import type { ConsoleData, Currency } from '../../lib/console/types';
import { useNow } from '../../lib/console/useNow';
import BalanceChart from './BalanceChart';
import CurrencyIcon from './CurrencyIcon';
import type { Page } from './nav';
import { Avatar, Button, Card, CardHeader, Money, PageHeader, Segmented, cx } from './ui';
import { TxnListItem } from './txn';

const CARD_GRID: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
  backgroundSize: '40px 40px',
  maskImage: 'radial-gradient(ellipse 90% 80% at 100% 0%, #000, transparent 70%)',
  WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 100% 0%, #000, transparent 70%)',
};

const CURRENCY_NAME: Record<Currency, string> = { NGN: 'Naira balance', USDT: 'USDT balance' };

type Range = '7' | '30' | '90';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function pctChange(now: number, before: number): number | null {
  if (before <= 0) return null;
  return ((now - before) / before) * 100;
}

function Change({ value }: { value: number | null }) {
  if (value === null || !isFinite(value)) return null;
  const up = value >= 0;
  return (
    <span className={cx('text-xs font-medium', up ? 'text-positive' : 'text-negative')}>
      {up ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function BalanceCard({
  currency,
  data,
  canWithdraw,
  onWithdraw,
  onNavigate,
}: {
  currency: Currency;
  data: ConsoleData;
  canWithdraw: boolean;
  onWithdraw: (c: Currency) => void;
  onNavigate: (p: Page, sub?: string) => void;
}) {
  const rule = data.rules[currency];
  const incoming = data.transactions
    .filter((t) => t.kind === 'payment' && t.currency === currency && t.status === 'pending')
    .reduce((s, t) => s + t.amount - t.fee, 0);
  const next = nextScheduledRun(rule);
  const modeLabel = rule.mode === 'manual' ? 'Manual' : rule.mode === 'automatic' ? 'Automatic' : 'Scheduled';

  return (
    // Black-and-gold card: the sign-in brand panel, at card size. Fixed brand
    // styling, so it reads the same in light and dark themes.
    <div className="relative overflow-hidden rounded-xl bg-[#0a0a0b] text-white p-6 flex flex-col ring-1 ring-white/5">
      <div aria-hidden className="absolute inset-0 opacity-[0.06]" style={CARD_GRID} />
      <div aria-hidden className="absolute -top-20 -right-16 size-56 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <p className="text-sm font-medium text-brand">{CURRENCY_NAME[currency]}</p>
        <CurrencyIcon currency={currency} className="size-7 rounded-full ring-2 ring-white/10" />
      </div>
      <Money
        amount={data.balances[currency]}
        currency={currency}
        className="relative mt-3 block text-[2rem] sm:text-[2.5rem] leading-none font-semibold text-white"
      />
      <p className="relative mt-2 text-sm text-slate-400 h-5">
        {incoming > 0 ? `${formatMoney(incoming, currency)} incoming` : 'Available to withdraw'}
      </p>

      <div className="relative mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
        <button type="button" onClick={() => onNavigate('settings', 'payouts')} className="min-w-0 text-left group cursor-pointer">
          <span className="block text-xs text-slate-500">Payouts · {modeLabel}</span>
          <span className="block text-sm text-slate-200 truncate group-hover:underline underline-offset-4 decoration-brand">
            {next ? `Next on ${formatNextRun(next)}` : describeRule(rule)}
          </span>
        </button>
        {canWithdraw && (
          <Button size="sm" variant="primary" onClick={() => onWithdraw(currency)}>
            <ArrowUpRight className="size-4" />
            Withdraw
          </Button>
        )}
      </div>
    </div>
  );
}

/** Things that need the merchant, as one quiet row of links. */
function Attention({ data, onNavigate }: { data: ConsoleData; onNavigate: (p: Page, sub?: string) => void }) {
  const disputes = data.disputes.filter((d) => d.status === 'needs_response');
  const items = [
    disputes.length > 0 && { label: `${disputes.length} dispute${disputes.length > 1 ? 's' : ''} to answer`, go: () => onNavigate('disputes', disputes[0].id) },
  ].filter((x): x is { label: string; go: () => void } => Boolean(x));
  if (!items.length) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-3 mr-1">Needs attention</span>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={it.go}
          className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-brand/50 bg-gold-soft text-[13px] font-medium text-gold hover:border-brand cursor-pointer transition-colors"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-brand" />
          {it.label}
          <ArrowRight className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

export default function OverviewPage({
  data,
  canWithdraw,
  onWithdraw,
  onNavigate,
  onOpenTxn,
}: {
  data: ConsoleData;
  canWithdraw: boolean;
  onWithdraw: (c: Currency) => void;
  onNavigate: (p: Page, sub?: string) => void;
  onOpenTxn: (id: string) => void;
}) {
  const [chartCurrency, setChartCurrency] = useState<Currency>('NGN');
  const [range, setRange] = useState<Range>('30');
  const now = useNow();
  const firstName = data.team.find((m) => m.isYou)?.name.split(' ')[0] ?? '';

  const stats = useMemo(() => {
    const period = (from: number, to: number) => {
      const txns = data.transactions.filter(
        (t) => t.createdAt >= from && t.createdAt < to && t.status !== 'failed'
      );
      const payments = txns.filter((t) => t.kind === 'payment');
      const withdrawals = txns.filter((t) => t.kind === 'withdrawal');
      return {
        received: payments.reduce((s, t) => s + toNgn(t.amount, t.currency), 0),
        withdrawn: withdrawals.reduce((s, t) => s + toNgn(t.amount, t.currency), 0),
        count: payments.length,
        customers: new Set(payments.map((t) => t.customerId)).size,
      };
    };
    return { current: period(now - 30 * DAY_MS, now + 1), previous: period(now - 60 * DAY_MS, now - 30 * DAY_MS) };
  }, [data.transactions, now]);

  const points = useMemo(
    () => data.history.slice(-Number(range)).map((p) => ({ t: p.t, v: p[chartCurrency] })),
    [data.history, range, chartCurrency]
  );
  const first = points[0]?.v ?? 0;
  const last = points[points.length - 1]?.v ?? 0;

  const topCustomers = useMemo(() => {
    const since = now - 30 * DAY_MS;
    const totals = new Map<string, number>();
    for (const t of data.transactions) {
      if (t.kind !== 'payment' || t.status !== 'successful' || t.createdAt < since || !t.customerId) continue;
      totals.set(t.customerId, (totals.get(t.customerId) ?? 0) + toNgn(t.amount, t.currency));
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([id, total]) => ({ customer: data.customers.find((c) => c.id === id)!, total }))
      .filter((x) => x.customer);
  }, [data.transactions, data.customers, now]);

  const statTiles = [
    { label: 'Received', value: formatMoney(stats.current.received, 'NGN', { compact: true }), change: pctChange(stats.current.received, stats.previous.received) },
    { label: 'Withdrawn', value: formatMoney(stats.current.withdrawn, 'NGN', { compact: true }), change: null },
    { label: 'Payments', value: stats.current.count.toLocaleString(), change: pctChange(stats.current.count, stats.previous.count) },
    { label: 'Paying customers', value: String(stats.current.customers), change: null },
  ];

  return (
    <>
      <PageHeader
        title={firstName ? `${greeting()}, ${firstName}` : greeting()}
        description="Here's where your money stands today."
      />

      <Attention data={data} onNavigate={onNavigate} />

      <div className="grid gap-4 md:grid-cols-2">
        <BalanceCard currency="NGN" data={data} canWithdraw={canWithdraw} onWithdraw={onWithdraw} onNavigate={onNavigate} />
        <BalanceCard currency="USDT" data={data} canWithdraw={canWithdraw} onWithdraw={onWithdraw} onNavigate={onNavigate} />
      </div>

      <Card className="mt-4 grid grid-cols-2 lg:grid-cols-4">
        {statTiles.map((s, i) => (
          <div
            key={s.label}
            className={cx(
              'p-5',
              i % 2 === 1 && 'border-l border-line',
              i >= 2 && 'border-t lg:border-t-0 border-line',
              i === 2 && 'lg:border-l'
            )}
          >
            <p className="text-xs text-ink-3">{s.label} · 30 days</p>
            <p className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl font-semibold tabular-nums tracking-tight text-ink">{s.value}</span>
              <Change value={s.change} />
            </p>
          </div>
        ))}
      </Card>
      <p className="mt-2 text-xs text-ink-3">USDT is counted in naira at the demo rate. Changes compare with the 30 days before.</p>

      <Card className="mt-6">
        <CardHeader
          title={chartCurrency === 'NGN' ? 'Naira balance' : 'USDT balance'}
          description={
            <span className="inline-flex flex-wrap items-baseline gap-x-2">
              <span>
                {formatMoney(last - first, chartCurrency, { sign: true })} over {range} days
              </span>
              <Change value={pctChange(last, first)} />
            </span>
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Segmented
                label="Currency"
                size="sm"
                value={chartCurrency}
                onChange={setChartCurrency}
                options={[
                  { value: 'NGN', label: 'NGN' },
                  { value: 'USDT', label: 'USDT' },
                ]}
              />
              <Segmented
                label="Range"
                size="sm"
                value={range}
                onChange={setRange}
                options={[
                  { value: '7', label: '7D' },
                  { value: '30', label: '30D' },
                  { value: '90', label: '90D' },
                ]}
              />
            </div>
          }
        />
        <div className="px-3 sm:px-5 pb-5">
          <BalanceChart points={points} currency={chartCurrency} />
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader
            title="Recent transactions"
            actions={
              <Button variant="ghost" size="sm" onClick={() => onNavigate('transactions')}>
                View all <ArrowRight className="size-4" />
              </Button>
            }
          />
          <ul className="border-t border-line divide-y divide-line">
            {data.transactions.slice(0, 7).map((t) => (
              <TxnListItem key={t.id} txn={t} data={data} onOpen={onOpenTxn} />
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader
            title="Top customers"
            description="Last 30 days"
            actions={
              <Button variant="ghost" size="sm" onClick={() => onNavigate('customers')}>
                All <ArrowRight className="size-4" />
              </Button>
            }
          />
          <ol className="border-t border-line divide-y divide-line">
            {topCustomers.map(({ customer, total }, i) => (
              <li key={customer.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-4 text-xs font-mono text-ink-3">{i + 1}</span>
                <Avatar name={customer.name} size="sm" />
                <span className="min-w-0 flex-1 text-sm text-ink truncate">{customer.name}</span>
                <Money amount={total} currency="NGN" compact className="text-sm text-ink" />
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
