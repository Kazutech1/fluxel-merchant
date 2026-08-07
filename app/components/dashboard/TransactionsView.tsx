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
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, correlation, customer..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white fast-transition"
            />
          </div>

          <select
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
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
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
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
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
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
          className="w-full md:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs fast-transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-6">Txn ID & Kind</th>
              <th className="py-3 px-6">Customer / Target</th>
              <th className="py-3 px-6">Amount</th>
              <th className="py-3 px-6">Correlation ID</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            {filtered.map((txn) => (
              <tr key={txn.id} className="hover:bg-slate-50 fast-transition">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2.5">
                    <AssetIcon code={txn.asset_code} className="w-6 h-6" />
                    <div>
                      <span className="font-mono font-bold text-slate-900 block">{txn.id}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-500">{txn.kind.replace('_', ' ')}</span>
                    </div>
                  </div>
                </td>

                <td className="py-4 px-6 font-semibold text-slate-900">
                  {txn.customer_name || 'System Action'}
                </td>

                <td className="py-4 px-6 font-bold text-slate-900">
                  <MinorUnitFormatter amount={txn.amount} assetCode={txn.asset_code} />
                </td>

                <td className="py-4 px-6">
                  <CorrelationBadge correlationId={txn.correlation_id} />
                </td>

                <td className="py-4 px-6">
                  <span className={`px-2.5 py-1 rounded font-bold text-[10px] uppercase border ${
                    txn.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : txn.status === 'pending_review'
                      ? 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold'
                      : txn.status === 'underpaid'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {txn.status}
                  </span>
                </td>

                <td className="py-4 px-6 text-right space-x-2">
                  <button
                    onClick={() => setPrintTxn(txn)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded fast-transition cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                    title="Print Receipt"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Receipt</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedTxn(txn);
                      setDrawerTab('details');
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold text-xs fast-transition cursor-pointer"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transaction Detail Drawer */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs fast-transition">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Transaction Inspector</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedTxn.id}</p>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 fast-transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setDrawerTab('details')}
                className={`flex-1 py-1.5 rounded-md fast-transition ${
                  drawerTab === 'details' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setDrawerTab('ledger')}
                className={`flex-1 py-1.5 rounded-md fast-transition ${
                  drawerTab === 'ledger' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Double-Entry Legs
              </button>
              <button
                onClick={() => setDrawerTab('json')}
                className={`flex-1 py-1.5 rounded-md fast-transition ${
                  drawerTab === 'json' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Raw JSON Payload
              </button>
            </div>

            {/* Tab 1: Overview Details */}
            {drawerTab === 'details' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold uppercase">Amount</span>
                    <span className="text-base font-bold text-slate-900">
                      <MinorUnitFormatter amount={selectedTxn.amount} assetCode={selectedTxn.asset_code} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold uppercase">Kind</span>
                    <span className="font-mono text-slate-800 uppercase">{selectedTxn.kind}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold uppercase">Status</span>
                    <span className="font-bold text-slate-900 uppercase">{selectedTxn.status}</span>
                  </div>
                </div>

                {/* Block Confirmation Depth Bar */}
                {selectedTxn.block_confirmations && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-indigo-900 font-bold">
                      <span>Blockchain Confirmations</span>
                      <span>{selectedTxn.block_confirmations.current} / {selectedTxn.block_confirmations.required} Blocks</span>
                    </div>
                    <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full fast-transition"
                        style={{
                          width: `${Math.min(
                            100,
                            (selectedTxn.block_confirmations.current / selectedTxn.block_confirmations.required) * 100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Fee Breakdown */}
                {selectedTxn.fee_breakdown && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Fee Breakdown</span>
                    <div className="flex justify-between text-slate-600">
                      <span>Gross Amount:</span>
                      <MinorUnitFormatter amount={selectedTxn.fee_breakdown.gross_amount} assetCode={selectedTxn.asset_code} />
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Network / Rail Fee:</span>
                      <MinorUnitFormatter amount={selectedTxn.fee_breakdown.network_fee} assetCode={selectedTxn.asset_code} />
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                      <span>Net Amount Credited:</span>
                      <MinorUnitFormatter amount={selectedTxn.fee_breakdown.net_amount} assetCode={selectedTxn.asset_code} />
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 font-bold uppercase block mb-1">Correlation ID</span>
                  <CorrelationBadge correlationId={selectedTxn.correlation_id} />
                </div>

                {/* Manual Operational Actions */}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Manual Operational Actions</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onQueryProviderStatus(selectedTxn.id)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-xs flex items-center justify-center gap-1.5 fast-transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Query Provider</span>
                    </button>

                    <button
                      onClick={() => onReplayWebhook(selectedTxn.correlation_id)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-xs flex items-center justify-center gap-1.5 fast-transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Replay Webhook</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Double-Entry Posting Legs */}
            {drawerTab === 'ledger' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-900 text-white rounded-lg font-mono text-[11px] space-y-1">
                  <span className="text-slate-400 block uppercase font-bold">Double-Entry Rule (Doc 3)</span>
                  <p className="text-emerald-400">Every money move requires balanced Debit and Credit legs ($Debits == Credits$).</p>
                </div>

                <div className="space-y-2">
                  {selectedTxn.double_entry_legs?.map((leg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border flex items-center justify-between ${
                        leg.type === 'debit'
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{leg.account_code}</span>
                          <span className="font-semibold">{leg.account_name}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white border">
                          {leg.type}
                        </span>
                      </div>
                      <div className="font-bold text-sm">
                        <MinorUnitFormatter amount={leg.amount} assetCode={leg.asset_code} />
                      </div>
                    </div>
                  )) || <p className="text-slate-500">No double-entry legs generated for this mock transaction.</p>}
                </div>
              </div>
            )}

            {/* Tab 3: Raw JSON Payload */}
            {drawerTab === 'json' && (
              <div>
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 overflow-x-auto">
                  {JSON.stringify(selectedTxn.raw_payload || selectedTxn, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print Receipt Modal */}
      <PrintReceiptModal
        isOpen={Boolean(printTxn)}
        transaction={printTxn}
        businessName={businessName}
        onClose={() => setPrintTxn(null)}
      />
    </div>
  );
}
