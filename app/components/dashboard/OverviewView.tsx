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
    { code: 'NGN', name: 'Naira Float Account', tag: 'Lenco Settlement Rail', bg: 'border-emerald-200 bg-emerald-50/50' },
    { code: 'USDT', name: 'Tether USD', tag: 'TRON / TRC-20', bg: 'border-indigo-200 bg-indigo-50/50' },
    { code: 'ETH', name: 'Ethereum', tag: 'EVM Mainnet', bg: 'border-blue-200 bg-blue-50/50' },
    { code: 'BTC', name: 'Bitcoin', tag: 'BIP84 Native Segwit', bg: 'border-amber-200 bg-amber-50/50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{businessSettings.business_name}</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Merchant Overview · Multi-Currency Settlement Engine (v1.1)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRequestCreateIntent}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs fast-transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Fiat Deposit Intent</span>
          </button>
          <button
            onClick={onRequestPayout}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs fast-transition cursor-pointer"
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
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{asset.code} Balance</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                {asset.tag}
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                <MinorUnitFormatter amount={balances[asset.code]} assetCode={asset.code} />
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Available Settlement Balance</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lenco Static Account Detail Banner (ADR-024) */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Permanent Business Float Account (ADR-024)</span>
          </div>
          <p className="text-sm font-semibold text-slate-200">
            Directly top-up your merchant NGN settlement float anytime via bank transfer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-800/80 backdrop-blur-xs px-5 py-3 rounded-lg border border-slate-700">
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
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 fast-transition cursor-pointer"
            >
              View All Transactions &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentTransactions.slice(0, 5).map((txn) => (
              <div key={txn.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:bg-slate-50 px-2 rounded-lg fast-transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AssetIcon code={txn.asset_code} className="w-7 h-7 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 uppercase shrink-0">{txn.kind.replace('_', ' ')}</span>
                      <CorrelationBadge correlationId={txn.correlation_id} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate">{txn.customer_name || 'System Merchant Action'}</p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-xs font-bold text-slate-900">
                    <MinorUnitFormatter amount={txn.amount} assetCode={txn.asset_code} />
                  </div>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${
                    txn.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {txn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Deposit Intents & Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">Active Deposit Intents</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">30-Min Expiry</span>
          </div>

          <div className="space-y-3">
            {recentIntents.map((intent) => (
              <div key={intent.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AssetIcon code={intent.asset_code} className="w-5 h-5" />
                    <span className="text-xs font-mono font-bold text-slate-900">{intent.id}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    intent.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : intent.status === 'underpaid'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {intent.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>{intent.customer_name}</span>
                  <MinorUnitFormatter amount={intent.expected_amount} assetCode={intent.asset_code} />
                </div>

                {intent.status === 'underpaid' && (
                  <p className="text-[11px] text-rose-600 font-medium bg-rose-50 p-2 rounded border border-rose-100">
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
