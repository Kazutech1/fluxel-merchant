'use client';

import React from 'react';
import {
  AssetCode,
  Transaction,
  DepositIntent,
  Customer,
  BusinessSettings,
} from '../../types/dashboard';
import MinorUnitFormatter from '../common/MinorUnitFormatter';
import CorrelationBadge from '../common/CorrelationBadge';
import AssetIcon from '../common/AssetIcon';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Users,
  Send,
  Building2,
  Activity,
  ShieldCheck,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { TabType } from '../common/Sidebar';

interface OverviewViewProps {
  balances: Record<AssetCode, string>;
  recentTransactions: Transaction[];
  recentIntents: DepositIntent[];
  businessSettings: BusinessSettings;
  onNavigateTab: (tab: TabType) => void;
  onRequestCreateIntent: () => void;
  onRequestPayout: () => void;
}

export default function OverviewView({
  balances,
  recentTransactions,
  recentIntents,
  businessSettings,
  onNavigateTab,
  onRequestCreateIntent,
  onRequestPayout,
}: OverviewViewProps) {
  const assetCards: { code: AssetCode; name: string; tag: string; bg: string }[] = [
    { code: 'NGN', name: 'Naira Float Account', tag: 'Lenco Settlement Rail', bg: 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20' },
    { code: 'USDT', name: 'Tether USD', tag: 'TRON / TRC-20', bg: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20' },
    { code: 'ETH', name: 'Ethereum', tag: 'EVM Mainnet', bg: 'border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20' },
    { code: 'BTC', name: 'Bitcoin', tag: 'BIP84 Native Segwit', bg: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 fast-transition">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{businessSettings.business_name}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Merchant Overview · Multi-Currency Settlement Engine (v1.1)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRequestCreateIntent}
            className="px-4 py-2.5 bg-indigo-600 dark:bg-[#fed700] hover:bg-indigo-700 dark:hover:bg-amber-300 text-white dark:text-slate-950 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs fast-transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Deposit Intent</span>
          </button>
          <button
            onClick={onRequestPayout}
            className="px-4 py-2.5 bg-slate-900 dark:bg-[#1c1c20] hover:bg-slate-800 dark:hover:bg-slate-800 text-white dark:text-slate-100 border dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs fast-transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Initiate Payout</span>
          </button>
        </div>
      </div>

      {/* Asset Balance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {assetCards.map((asset) => (
          <div
            key={asset.code}
            className={`p-5 rounded-xl border ${asset.bg} shadow-xs space-y-3 hover:shadow-md fast-transition`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AssetIcon code={asset.code} className="w-6 h-6" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{asset.code} Balance</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white dark:bg-[#1c1c20] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                {asset.tag}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                <MinorUnitFormatter amount={balances[asset.code]} assetCode={asset.code} />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Available Settlement Balance</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lenco Static Account Detail Banner (ADR-024) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-[#0d0d0d] text-white rounded-xl p-6 shadow-md border border-slate-800 dark:border-[#fed700]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 gold-border-glow">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#fed700]">
            <Building2 className="w-4 h-4 text-[#fed700]" />
            <span>Permanent Business Float Account (ADR-024)</span>
          </div>
          <p className="text-sm font-semibold text-slate-200">
            Directly top-up your merchant NGN settlement float anytime via bank transfer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-800/80 dark:bg-[#141416]/90 backdrop-blur-xs px-5 py-3 rounded-lg border border-slate-700 dark:border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Name</span>
            <span className="text-xs font-bold text-white">{businessSettings.static_bank_name}</span>
          </div>
          <div className="h-6 w-px bg-slate-700"></div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Number</span>
            <span className="text-sm font-mono font-bold text-emerald-400">{businessSettings.static_account_number}</span>
          </div>
          <div className="h-6 w-px bg-slate-700"></div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Name</span>
            <span className="text-xs font-bold text-white">{businessSettings.static_account_name}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Recent Activity & Pending Intents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-[#fed700]" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-semibold text-indigo-600 dark:text-[#fed700] hover:underline cursor-pointer"
            >
              View All Transactions &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.slice(0, 5).map((txn) => (
              <div key={txn.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg fast-transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AssetIcon code={txn.asset_code} className="w-7 h-7 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase shrink-0">{txn.kind.replace('_', ' ')}</span>
                      <CorrelationBadge correlationId={txn.correlation_id} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{txn.customer_name || 'System Merchant Action'}</p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    <MinorUnitFormatter amount={txn.amount} assetCode={txn.asset_code} />
                  </div>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                    txn.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                  }`}>
                    {txn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Deposit Intents & Status */}
        <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Deposit Intents</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">30-Min Expiry</span>
          </div>

          <div className="space-y-3">
            {recentIntents.map((intent) => (
              <div key={intent.id} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AssetIcon code={intent.asset_code} className="w-5 h-5" />
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{intent.id}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    intent.status === 'completed'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                      : intent.status === 'underpaid'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                  }`}>
                    {intent.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <span>{intent.customer_name}</span>
                  <MinorUnitFormatter amount={intent.expected_amount} assetCode={intent.asset_code} />
                </div>

                {intent.status === 'underpaid' && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-100 dark:border-rose-900/50">
                    Partial payment received (₦90,000). Routed to Ops Underpaid Board.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
