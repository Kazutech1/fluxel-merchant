'use client';

import React, { useState } from 'react';
import { Transaction } from '../../types/dashboard';
import MinorUnitFormatter from '../common/MinorUnitFormatter';
import CorrelationBadge from '../common/CorrelationBadge';
import PrintReceiptModal from '../common/PrintReceiptModal';
import AssetIcon from '../common/AssetIcon';
import { Search, Download, Printer, RefreshCw, Send, X, ArrowUpRight, ArrowDownLeft, Clock, ShieldAlert, Code2, Layers } from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  businessName: string;
  onQueryProviderStatus: (txnId: string) => void;
  onReplayWebhook: (correlationId: string) => void;
}

export default function TransactionsView({
  transactions,
  businessName,
  onQueryProviderStatus,
  onReplayWebhook,
}: TransactionsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<string>('all');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [printTxn, setPrintTxn] = useState<Transaction | null>(null);
  const [drawerTab, setDrawerTab] = useState<'details' | 'ledger' | 'json'>('details');

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.correlation_id.toLowerCase().includes(search.toLowerCase()) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.external_ref && t.external_ref.toLowerCase().includes(search.toLowerCase()));

    const matchesKind = selectedKind === 'all' || t.kind === selectedKind;
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    const matchesAsset = selectedAsset === 'all' || t.asset_code === selectedAsset;

    return matchesSearch && matchesKind && matchesStatus && matchesAsset;
  });

  const handleExportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ID,Kind,Asset,Amount,Status,Correlation_ID,Created_At']
        .concat(
          filtered.map(
            (t) => `${t.id},${t.kind},${t.asset_code},${t.amount},${t.status},${t.correlation_id},${t.created_at}`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fluxel_transactions_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 fast-transition">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, correlation, customer..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700] fast-transition outline-none"
            />
          </div>

          <select
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 font-medium outline-none"
          >
            <option value="all">All Kinds</option>
            <option value="deposit">Deposits</option>
            <option value="payout">Payouts</option>
            <option value="crypto_withdrawal">Withdrawals</option>
            <option value="internal_transfer">Internal Transfers</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 font-medium outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="pending_review">Pending Review (Holds)</option>
            <option value="underpaid">Underpaid</option>
          </select>

          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 font-medium outline-none"
          >
            <option value="all">All Assets</option>
            <option value="NGN">NGN</option>
            <option value="USDT">USDT</option>
            <option value="ETH">ETH</option>
            <option value="BTC">BTC</option>
          </select>
        </div>

        <button
          onClick={handleExportCsv}
          className="w-full md:w-auto px-4 py-2 bg-slate-900 dark:bg-[#fed700] hover:bg-slate-800 dark:hover:bg-amber-300 text-white dark:text-slate-950 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs fast-transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-x-auto fast-transition">
        <table className="w-full text-left border-collapse min-w-[750px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#1c1c20] border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="py-3 px-6">Txn ID & Kind</th>
              <th className="py-3 px-6">Customer / Target</th>
              <th className="py-3 px-6">Amount</th>
              <th className="py-3 px-6">Correlation ID</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium">
            {filtered.map((txn) => (
              <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 fast-transition">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2.5">
                    <AssetIcon code={txn.asset_code} className="w-6 h-6" />
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white block">{txn.id}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{txn.kind.replace('_', ' ')}</span>
                    </div>
                  </div>
                </td>

                <td className="py-4 px-6 font-semibold text-slate-900 dark:text-[#fed700]">
                  {txn.customer_name || txn.destination || 'System Merchant Action'}
                </td>

                <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                  <MinorUnitFormatter amount={txn.amount} assetCode={txn.asset_code} />
                </td>

                <td className="py-4 px-6">
                  <CorrelationBadge correlationId={txn.correlation_id} />
                </td>

                <td className="py-4 px-6">
                  <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded uppercase border ${
                    txn.status === 'completed'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                      : txn.status === 'pending_review'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}>
                    {txn.status.replace('_', ' ')}
                  </span>
                </td>

                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedTxn(txn)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-[#1c1c20] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-bold fast-transition cursor-pointer"
                    >
                      Inspect
                    </button>
                    <button
                      onClick={() => setPrintTxn(txn)}
                      title="Print PDF Settlement Receipt"
                      className="p-1 text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded fast-transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transaction Detail Drawer */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs fast-transition">
          <div className="w-full max-w-lg bg-white dark:bg-[#141416] h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transaction Inspector</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{selectedTxn.id}</p>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 fast-transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-[#1c1c20] p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold">
              <button
                onClick={() => setDrawerTab('details')}
                className={`flex-1 py-1.5 rounded-md fast-transition ${
                  drawerTab === 'details'
                    ? 'bg-white dark:bg-[#fed700] text-slate-900 dark:text-slate-950 font-bold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setDrawerTab('ledger')}
                className={`flex-1 py-1.5 rounded-md fast-transition ${
                  drawerTab === 'ledger'
                    ? 'bg-white dark:bg-[#fed700] text-slate-900 dark:text-slate-950 font-bold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Double-Entry Legs
              </button>
              <button
                onClick={() => setDrawerTab('json')}
                className={`flex-1 py-1.5 rounded-md fast-transition ${
                  drawerTab === 'json'
                    ? 'bg-white dark:bg-[#fed700] text-slate-900 dark:text-slate-950 font-bold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Raw JSON Payload
              </button>
            </div>

            {/* Tab 1: Overview Details */}
            {drawerTab === 'details' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-[#1c1c20] rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-bold uppercase">Amount</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      <MinorUnitFormatter amount={selectedTxn.amount} assetCode={selectedTxn.asset_code} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-bold uppercase">Status</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{selectedTxn.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-bold uppercase">Created At</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{new Date(selectedTxn.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">Correlation Metadata</span>
                  <div className="p-3 bg-slate-50 dark:bg-[#1c1c20] rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1">
                    <div><span className="text-slate-500 dark:text-slate-400">fx_correlation_id:</span> {selectedTxn.correlation_id}</div>
                    {selectedTxn.destination && (
                      <div><span className="text-slate-500 dark:text-slate-400">destination:</span> {selectedTxn.destination}</div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => onQueryProviderStatus(selectedTxn.id)}
                    className="flex-1 py-2 bg-slate-900 dark:bg-[#fed700] hover:bg-slate-800 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Query Provider Status</span>
                  </button>
                  <button
                    onClick={() => onReplayWebhook(selectedTxn.correlation_id)}
                    className="flex-1 py-2 bg-indigo-600 dark:bg-[#1c1c20] hover:bg-indigo-700 dark:hover:bg-slate-800 text-white dark:text-slate-200 border dark:border-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Replay Webhook</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Double Entry Ledger */}
            {drawerTab === 'ledger' && (
              <div className="space-y-3 text-xs font-mono">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">Double-Entry Journal Posting</span>
                <div className="p-3 bg-slate-50 dark:bg-[#1c1c20] rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>[DEBIT] Merchant Float Account ({selectedTxn.asset_code})</span>
                    <span>+<MinorUnitFormatter amount={selectedTxn.amount} assetCode={selectedTxn.asset_code} /></span>
                  </div>
                  <div className="flex items-center justify-between text-indigo-600 dark:text-[#fed700]">
                    <span>[CREDIT] Provider Omnibus Clearing Account</span>
                    <span>-<MinorUnitFormatter amount={selectedTxn.amount} assetCode={selectedTxn.asset_code} /></span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: JSON */}
            {drawerTab === 'json' && (
              <pre className="p-4 bg-slate-900 dark:bg-[#0d0d0d] text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 overflow-x-auto">
                {JSON.stringify(selectedTxn, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <PrintReceiptModal
        isOpen={Boolean(printTxn)}
        transaction={printTxn}
        businessName={businessName}
        onClose={() => setPrintTxn(null)}
      />
    </div>
  );
}
