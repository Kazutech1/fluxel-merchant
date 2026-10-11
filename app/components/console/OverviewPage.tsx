'use client';

import React, { useMemo } from 'react';
import { ArrowRight, ArrowUpRight, BadgeCheck, Link2, UserPlus } from 'lucide-react';

import { useAssets, useBalances, useCustomers, useDisputes, useSettlementSummary, useStaticAccount, useTransactions } from '../../lib/console/data';
import { DAY_MS, startOfDay } from '../../lib/console/format';
import { decimalsFor, formatMajor, toMajor } from '../../lib/console/money';
import type { AssetTotal } from '../../lib/console/models';
import { useNow } from '../../lib/console/useNow';
import { can } from '../../lib/permissions';
import BarChart from './BarChart';
import CurrencyIcon from './CurrencyIcon';
import type { PageProps } from './nav';
import { Button, Card, CardHeader, CopyButton, EmptyState, ErrorState, LoadingRows, Money, PageHeader, Skeleton, cx } from './ui';
import { TxnListItem } from './txn';

const CARD_GRID: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
  backgroundSize: '40px 40px',
  maskImage: 'radial-gradient(ellipse 90% 80% at 100% 0%, #000, transparent 70%)',
  WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 100% 0%, #000, transparent 70%)',
};

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function ngnTotal(rows: AssetTotal[] | undefined, decimals: number): number {
  return toMajor(rows?.find((r) => r.asset_code === 'NGN')?.total ?? '0', decimals);
}

export default function OverviewPage({ role, business, onNavigate, onOpenTxn, onWithdraw }: PageProps) {
  const now = useNow(5 * 60_000);
  const from = useMemo(() => new Date(startOfDay(now) - 29 * DAY_MS).toISOString(), [now]);
  const to = useMemo(() => new Date(startOfDay(now) + DAY_MS).toISOString(), [now]);

  const assets = useAssets();
  const balances = useBalances();
  const txns = useTransactions();
  const customers = useCustomers();
  const disputes = useDisputes();
  const summary = useSettlementSummary(from, to);
  const staticAccount = useStaticAccount();

  const ngnDecimals = decimalsFor('NGN', assets.data);
  const ngn = balances.data?.find((b) => b.asset_code === 'NGN');
  const crypto = (balances.data ?? []).filter((b) => b.asset_code !== 'NGN' && Number(b.available) > 0);
  const openDisputes = (disputes.data ?? []).filter((d) => d.status === 'open' || d.status === 'under_review');

  const daily = useMemo(() => {
    const start = startOfDay(now) - 29 * DAY_MS;
    const days = Array.from({ length: 30 }, (_, i) => ({ t: start + i * DAY_MS, v: 0, count: 0 }));
    for (const t of txns.data ?? []) {
      if (t.direction !== 'in' || t.asset_code !== 'NGN' || t.status === 'failed') continue;
      const i = Math.floor((startOfDay(Date.parse(t.created_at ?? '')) - start) / DAY_MS);
      if (days[i]) {
        days[i].v += toMajor(t.amount, ngnDecimals);
        days[i].count++;
      }
    }
    return days;
  }, [txns.data, now, ngnDecimals]);
  const hasDeposits = daily.some((d) => d.count > 0);

  const stats = [
    { label: 'Received', value: summary.data ? formatMajor(ngnTotal(summary.data.deposits, ngnDecimals), 'NGN', { compact: true }) : null },
    { label: 'Paid out', value: summary.data ? formatMajor(ngnTotal(summary.data.payouts, ngnDecimals), 'NGN', { compact: true }) : null },
    { label: 'Deposits', value: txns.data ? String(daily.reduce((s, d) => s + d.count, 0)) : null },
    { label: 'Customers', value: customers.data ? String(customers.data.length) : null },
  ];

  return (
    <>
      <PageHeader
        title={greeting()}
        description={`${business.name} · ${business.tier_1 ? 'Live' : 'Sandbox account'}`}
        actions={
          can(role, 'customers.write') && (
            <>
              <Button onClick={() => onNavigate('links', 'new')}>
                <Link2 className="size-4" />
                Payment link
              </Button>
              <Button onClick={() => onNavigate('customers', 'new')}>
                <UserPlus className="size-4" />
                Customer
              </Button>
            </>
          )
        }
      />

      {!business.tier_1 && (
        <button
          type="button"
          onClick={() => onNavigate('settings', 'verification')}
          className="mb-6 w-full flex items-center gap-3 rounded-xl border border-brand/50 bg-gold-soft px-5 py-4 text-left hover:border-brand transition-colors cursor-pointer"
        >
          <BadgeCheck className="size-5 text-gold shrink-0" />
          <span className="flex-1 text-sm">
            <span className="font-medium text-ink">{business.status === 'kyb_pending' ? 'Verification in review.' : 'Verify your business to go live.'}</span>{' '}
            <span className="text-ink-2">
              {business.status === 'kyb_pending'
                ? 'We’ll unlock live payments as soon as it’s approved.'
                : 'Sandbox works now — live payments unlock after KYB.'}
            </span>
          </span>
          <ArrowRight className="size-4 text-gold" />
        </button>
      )}

      {openDisputes.length > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('disputes')}
          className="mb-6 inline-flex items-center gap-2 h-8 px-3 rounded-full border border-brand/50 bg-gold-soft text-[13px] font-medium text-gold hover:border-brand cursor-pointer"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-brand" />
          {openDisputes.length} open {openDisputes.length === 1 ? 'dispute' : 'disputes'}
          <ArrowRight className="size-3.5" />
        </button>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Naira balance — the black-and-gold card */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-xl bg-[#0a0a0b] text-white p-6 flex flex-col ring-1 ring-white/5 min-h-[220px]">
          <div aria-hidden className="absolute inset-0 opacity-[0.06]" style={CARD_GRID} />
          <div aria-hidden className="absolute -top-20 -right-16 size-56 rounded-full bg-brand/15 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <p className="text-sm font-medium text-brand">Naira balance</p>
            <CurrencyIcon asset="NGN" className="size-7 rounded-full ring-2 ring-white/10" />
          </div>
          {balances.loading ? (
            <Skeleton className="relative mt-4 h-10 w-56 bg-white/10" />
          ) : balances.error ? (
            <p className="relative mt-4 text-sm text-slate-400">{balances.error.message}</p>
          ) : (
            <Money
              minor={ngn?.available ?? '0'}
              asset="NGN"
              assets={assets.data}
              className="relative mt-3 block text-[2rem] sm:text-[2.5rem] leading-none font-semibold text-white"
            />
          )}
          <p className="relative mt-2 text-sm text-slate-400">Available to withdraw</p>

          <div className="relative mt-auto pt-5 border-t border-white/10 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 text-xs">
              {staticAccount.data ? (
                <>
                  <span className="block text-slate-500">Fund by bank transfer</span>
                  <span className="flex items-center gap-1 text-sm text-slate-200 [&_button]:text-slate-400 [&_button:hover]:text-brand [&_button:hover]:bg-white/5">
                    {staticAccount.data.bank_name} · <span className="font-mono">{staticAccount.data.account_number}</span>
                    <CopyButton value={staticAccount.data.account_number} label="Copy account number" />
                  </span>
                </>
              ) : (
                <span className="text-slate-500">{staticAccount.loading ? '' : 'Your funding account appears here once it’s issued.'}</span>
              )}
            </div>
            {can(role, 'payouts.write') && (
              <Button size="sm" variant="primary" onClick={onWithdraw}>
                <ArrowUpRight className="size-4" />
                Withdraw
              </Button>
            )}
          </div>
        </div>

        {/* Crypto balances */}
        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          <CardHeader title="Crypto balances" description="Held for your business" />
          <div className="border-t border-line flex-1">
            {balances.loading ? (
              <LoadingRows rows={3} />
            ) : crypto.length === 0 ? (
              <EmptyState title="No crypto yet" description="Stablecoin and crypto deposits show up here." />
            ) : (
              <ul className="divide-y divide-line">
                {crypto.map((b) => (
                  <li key={b.asset_code} className="flex items-center gap-3 px-5 py-3">
                    <CurrencyIcon asset={b.asset_code} className="size-8" />
                    <span className="flex-1 text-sm text-ink">{b.asset_code}</span>
                    <Money minor={b.available} asset={b.asset_code} assets={assets.data} className="text-sm font-medium text-ink" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4 grid grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={cx('p-5 border-line', i % 2 === 1 && 'border-l', i >= 2 && 'border-t lg:border-t-0', i === 2 && 'lg:border-l')}>
            <p className="text-xs text-ink-3">{s.label} · 30 days</p>
            {s.value === null ? (
              <Skeleton className="mt-2 h-6 w-24" />
            ) : (
              <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-ink">{s.value}</p>
            )}
          </div>
        ))}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Naira received per day" description="Last 30 days" />
        <div className="px-3 sm:px-5 pb-5">
          {txns.loading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : hasDeposits ? (
            <BarChart points={daily} currency="NGN" label="Naira received per day" />
          ) : (
            <div className="h-[220px] flex items-center justify-center rounded-lg border border-dashed border-line text-sm text-ink-3 text-center px-6">
              No naira deposits in the last 30 days. Share a payment link to get your first one.
            </div>
          )}
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader
          title="Recent activity"
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('transactions')}>
              View all <ArrowRight className="size-4" />
            </Button>
          }
        />
        <div className="border-t border-line">
          {txns.loading ? (
            <LoadingRows rows={4} />
          ) : txns.error ? (
            <ErrorState message={txns.error.message} onRetry={txns.reload} />
          ) : (txns.data ?? []).length === 0 ? (
            <EmptyState title="No transactions yet" description="Deposits, payouts and transfers appear here as they happen." />
          ) : (
            <ul className="divide-y divide-line">
              {txns.data!.slice(0, 7).map((t) => (
                <TxnListItem key={`${t.direction}:${t.id}`} txn={t} customers={customers.data} assets={assets.data} onOpen={onOpenTxn} />
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
