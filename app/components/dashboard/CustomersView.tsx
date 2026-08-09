'use client';

import React, { useState } from 'react';
import { Customer, Transaction, DepositIntent, AssetCode } from '../../types/dashboard';
import MinorUnitFormatter from '../common/MinorUnitFormatter';
import CorrelationBadge from '../common/CorrelationBadge';
import AssetIcon from '../common/AssetIcon';
import QrCodeModal from '../common/QrCodeModal';
import {
  Search,
  QrCode,
  Plus,
  ShieldCheck,
  AlertCircle,
  Edit3,
  X,
  Copy,
  Check,
  Lock,
  Unlock,
  CreditCard,
  Activity,
  Clock,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Maximize2,
  Minimize2,
  Building2,
} from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  transactions: Transaction[];
  intents: DepositIntent[];
  onToggleCustomerFreeze: (customerId: string, reason: string) => void;
  onCreateCustomer: (name: string, email: string, externalId: string) => void;
  onManualBalanceAdjustment: (customerId: string, asset: AssetCode, amount: string, reason: string) => void;
  onIssueDepositIntent: (customerId: string, amount: string) => void;
}

export default function CustomersView({
  customers,
  transactions,
  intents,
  onToggleCustomerFreeze,
  onCreateCustomer,
  onManualBalanceAdjustment,
  onIssueDepositIntent,
}: CustomersViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'activity' | 'intents'>('overview');
  const [isExpanded, setIsExpanded] = useState(false);

  // QR Modal state
  const [qrData, setQrData] = useState<{ title: string; subtitle: string; payload: string } | null>(null);

  // Manual Intent Modal
  const [showIntentModal, setShowIntentModal] = useState<Customer | null>(null);
  const [intentAmountInput, setIntentAmountInput] = useState('50000');

  // Manual Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState<Customer | null>(null);
  const [adjustAsset, setAdjustAsset] = useState<AssetCode>('NGN');
  const [adjustAmountInput, setAdjustAmountInput] = useState('10000');
  const [adjustReason, setAdjustReason] = useState('');

  // Freeze Modal
  const [freezeModalCustomer, setFreezeModalCustomer] = useState<Customer | null>(null);
  const [freezeReason, setFreezeReason] = useState('');

  // Create Customer Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newExtId, setNewExtId] = useState('');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.external_id.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleIntentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showIntentModal || !intentAmountInput) return;
    onIssueDepositIntent(showIntentModal.id, intentAmountInput);
    setShowIntentModal(null);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustModal || !adjustAmountInput || !adjustReason.trim()) return;

    let minorUnits = '0';
    try {
      const parsed = parseFloat(adjustAmountInput);
      if (adjustAsset === 'NGN') minorUnits = Math.round(parsed * 100).toString();
      if (adjustAsset === 'USDT') minorUnits = Math.round(parsed * 1000000).toString();
      if (adjustAsset === 'ETH') minorUnits = BigInt(Math.round(parsed * 1e18)).toString();
      if (adjustAsset === 'BTC') minorUnits = Math.round(parsed * 1e8).toString();
    } catch {
      minorUnits = '100000';
    }

    onManualBalanceAdjustment(showAdjustModal.id, adjustAsset, minorUnits, adjustReason);
    setShowAdjustModal(null);
    setAdjustReason('');
  };

  const handleFreezeConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freezeModalCustomer || !freezeReason.trim()) return;
    onToggleCustomerFreeze(freezeModalCustomer.id, freezeReason);
    setFreezeModalCustomer(null);
    setFreezeReason('');
  };

  // Filter transactions for selected customer
  const customerTransactions = selectedCustomer
    ? transactions.filter(
        (t) =>
          t.customer_id === selectedCustomer.id ||
          (t.customer_name && t.customer_name.toLowerCase().includes(selectedCustomer.name.toLowerCase()))
      )
    : [];

  // Filter deposit intents for selected customer
  const customerIntents = selectedCustomer
    ? intents.filter((i) => i.customer_id === selectedCustomer.id)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs fast-transition">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email, BVN, ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700] fast-transition outline-none"
          />
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 dark:bg-[#fed700] hover:bg-indigo-700 dark:hover:bg-amber-300 text-white dark:text-slate-950 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs fast-transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Customer</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-x-auto fast-transition">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#1c1c20] border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="py-3 px-6">Customer & Identity</th>
              <th className="py-3 px-6">KYC & Risk Score</th>
              <th className="py-3 px-6">Balances Overview</th>
              <th className="py-3 px-6">Scan QR & Actions</th>
              <th className="py-3 px-6 text-right">Account Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium">
            {filteredCustomers.map((cus) => (
              <tr key={cus.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 fast-transition">
                <td className="py-4 px-6 cursor-pointer" onClick={() => setSelectedCustomer(cus)}>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block hover:text-indigo-600 fast-transition">{cus.name}</span>
                    <span className="text-slate-500 font-mono text-[11px] block">{cus.email}</span>
                    <span className="text-[10px] text-slate-400 font-mono">BVN/Tax ID: {cus.bvn_tax_id}</span>
                  </div>
                </td>

                <td className="py-4 px-6">
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                      {cus.kyc_tier}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-500 font-medium">Risk Score:</span>
                      <span className={`font-bold ${cus.risk_score > 50 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {cus.risk_score} / 100
                      </span>
                    </div>
                  </div>
                </td>

                <td className="py-4 px-6">
                  <div className="space-y-0.5">
                    <div><MinorUnitFormatter amount={cus.balances.NGN} assetCode="NGN" /></div>
                    <div className="text-slate-500 text-[11px]"><MinorUnitFormatter amount={cus.balances.USDT} assetCode="USDT" /></div>
                  </div>
                </td>

                <td className="py-4 px-6 space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setQrData({
                          title: `Deposit to ${cus.name}`,
                          subtitle: 'TRON / TRC-20 Address QR Code',
                          payload: cus.wallets.find((w) => w.chain === 'TRON')?.address || 'TKYc9L3p...',
                        })
                      }
                      className="px-2.5 py-1 bg-slate-900 text-white rounded text-[10px] font-bold flex items-center gap-1 hover:bg-slate-800 fast-transition cursor-pointer"
                    >
                      <QrCode className="w-3 h-3 text-emerald-400" />
                      <span>QR Code</span>
                    </button>

                    <button
                      onClick={() => setShowIntentModal(cus)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold border border-indigo-200 fast-transition cursor-pointer"
                    >
                      + Intent
                    </button>
                  </div>
                </td>

                <td className="py-4 px-6 text-right space-x-2">
                  <button
                    onClick={() => {
                      setSelectedCustomer(cus);
                      setProfileTab('overview');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs fast-transition cursor-pointer"
                  >
                    Activities & Profile
                  </button>

                  <button
                    onClick={() => setShowAdjustModal(cus)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold text-xs fast-transition cursor-pointer"
                  >
                    Adjust
                  </button>

                  <button
                    onClick={() => setFreezeModalCustomer(cus)}
                    className={`px-3 py-1.5 rounded font-semibold text-xs fast-transition cursor-pointer ${
                      cus.status === 'active'
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {cus.status === 'active' ? 'Freeze' : 'Unfreeze'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Full Activity & Profile Inspector Modal/Drawer */}
      {selectedCustomer && (
        <div className={`fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs fast-transition ${
          isExpanded ? 'flex items-center justify-center p-6' : 'flex justify-end'
        }`}>
          <div className={`bg-white shadow-2xl border-slate-200 flex flex-col overflow-hidden fast-transition ${
            isExpanded
              ? 'w-full max-w-6xl h-[90vh] rounded-2xl border animate-in fade-in zoom-in-95 duration-200'
              : 'w-full max-w-2xl h-full border-l animate-in slide-in-from-right duration-200'
          }`}>
            {/* Fixed Sticky Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {selectedCustomer.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{selectedCustomer.name}</h3>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${
                      selectedCustomer.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {selectedCustomer.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedCustomer.id} · {selectedCustomer.email} · Ext ID: {selectedCustomer.external_id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Collapse to Side Drawer' : 'Expand to Fullscreen View'}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 fast-transition cursor-pointer"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4 text-indigo-600" /> : <Maximize2 className="w-4 h-4 text-indigo-600" />}
                  <span>{isExpanded ? 'Collapse View' : 'Expand Fullscreen'}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setIsExpanded(false);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 fast-transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {isExpanded ? (
                /* Expanded Multi-Column Layout */
                <div className="grid grid-cols-12 gap-6">
                  {/* Left Column: Identity, Balances, Addresses (5 cols) */}
                  <div className="col-span-12 lg:col-span-5 space-y-6">
                    {/* Identity Card */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Identity & Verification</h4>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500 font-bold uppercase">KYC Level</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{selectedCustomer.kyc_tier}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500 font-bold uppercase">BVN / Tax ID</span>
                        <span className="font-mono font-bold text-slate-900">{selectedCustomer.bvn_tax_id}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500 font-bold uppercase">Risk Rating</span>
                        <span className={`font-bold ${selectedCustomer.risk_score > 50 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {selectedCustomer.risk_score} / 100
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500 font-bold uppercase">Total Lifetime Txns</span>
                        <span className="font-bold text-slate-900">{selectedCustomer.transaction_count}</span>
                      </div>
                    </div>

                    {/* Asset Balances Grid */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Asset Balances Overview</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {(['NGN', 'USDT', 'ETH', 'BTC'] as AssetCode[]).map((asset) => (
                          <div key={asset} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center gap-2">
                              <AssetIcon code={asset} className="w-5 h-5" />
                              <span className="text-xs font-bold uppercase text-slate-700">{asset}</span>
                            </div>
                            <div className="text-base font-bold text-slate-900">
                              <MinorUnitFormatter amount={selectedCustomer.balances[asset] || '0'} assetCode={asset} showCode={false} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Issued Addresses */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Blockchain Deposit Addresses</h4>
                      <div className="space-y-2.5">
                        {selectedCustomer.wallets.map((w) => (
                          <div key={w.chain} className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold uppercase text-indigo-300">{w.chain}</span>
                              <button
                                onClick={() =>
                                  setQrData({
                                    title: `${w.chain} Address`,
                                    subtitle: `Customer: ${selectedCustomer.name}`,
                                    payload: w.address,
                                  })
                                }
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Scan QR</span>
                              </button>
                            </div>
                            <p className="font-mono text-xs text-emerald-400 break-all">{w.address}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Transactions Activity Timeline & Intents (7 cols) */}
                  <div className="col-span-12 lg:col-span-7 space-y-6">
                    {/* Activity Timeline */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-600" />
                          <span>Customer Activity Timeline ({customerTransactions.length})</span>
                        </h4>
                      </div>

                      {customerTransactions.length > 0 ? (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          {customerTransactions.map((txn) => (
                            <div key={txn.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 fast-transition">
                              <div className="flex items-center gap-3">
                                <AssetIcon code={txn.asset_code} className="w-7 h-7" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900 uppercase">{txn.kind.replace('_', ' ')}</span>
                                    <CorrelationBadge correlationId={txn.correlation_id} />
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400 block">{new Date(txn.created_at).toLocaleString()}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-xs font-bold text-slate-900">
                                  <MinorUnitFormatter amount={txn.amount} assetCode={txn.asset_code} />
                                </div>
                                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded mt-0.5 uppercase border ${
                                  txn.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {txn.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                          No transactions recorded for this customer yet.
                        </div>
                      )}
                    </div>

                    {/* Dynamic Deposit Intents */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Issued Dynamic Deposit Intents ({customerIntents.length})</span>
                      </h4>

                      {customerIntents.length > 0 ? (
                        <div className="space-y-2.5">
                          {customerIntents.map((intent) => (
                            <div key={intent.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AssetIcon code={intent.asset_code} className="w-5 h-5" />
                                  <span className="font-mono font-bold text-xs text-slate-900">{intent.id}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                                  intent.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : intent.status === 'underpaid'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {intent.status}
                                </span>
                              </div>

                              <div className="text-xs text-slate-700 space-y-1 font-mono">
                                <div>Bank: <strong>{intent.bank_name}</strong></div>
                                <div>Account: <strong>{intent.account_number}</strong></div>
                                <div>Expected Amount: <strong><MinorUnitFormatter amount={intent.expected_amount} assetCode={intent.asset_code} /></strong></div>
                              </div>

                              <div className="pt-1 flex justify-end">
                                <button
                                  onClick={() =>
                                    setQrData({
                                      title: `Dynamic VA: ${intent.account_number}`,
                                      subtitle: `${intent.bank_name} · ${intent.account_name}`,
                                      payload: intent.qr_payload || `NGN:${intent.account_number}:Lenco:${intent.expected_amount}`,
                                    })
                                  }
                                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Scan QR Payment</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                          No deposit intents issued.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Drawer View when not expanded */
                <div className="space-y-6">
                  {/* Tabs */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                    <button
                      onClick={() => setProfileTab('overview')}
                      className={`flex-1 py-2 rounded-md fast-transition cursor-pointer ${
                        profileTab === 'overview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      Overview & Balances
                    </button>
                    <button
                      onClick={() => setProfileTab('activity')}
                      className={`flex-1 py-2 rounded-md fast-transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        profileTab === 'activity' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Transactions ({customerTransactions.length})</span>
                    </button>
                    <button
                      onClick={() => setProfileTab('intents')}
                      className={`flex-1 py-2 rounded-md fast-transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        profileTab === 'intents' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Intents ({customerIntents.length})</span>
                    </button>
                  </div>

                  {/* Tab 1: Overview & Balances */}
                  {profileTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">KYC Level</span>
                          <span className="text-xs font-bold text-indigo-700">{selectedCustomer.kyc_tier}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Risk Score</span>
                          <span className={`text-xs font-bold ${selectedCustomer.risk_score > 50 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {selectedCustomer.risk_score} / 100
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Lifetime Txns</span>
                          <span className="text-xs font-bold text-slate-900">{selectedCustomer.transaction_count}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">BVN / Tax ID</span>
                          <span className="text-xs font-mono font-bold text-slate-900">{selectedCustomer.bvn_tax_id}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Asset Balances</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {(['NGN', 'USDT', 'ETH', 'BTC'] as AssetCode[]).map((asset) => (
                            <div key={asset} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <AssetIcon code={asset} className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase text-slate-700">{asset}</span>
                              </div>
                              <span className="text-sm font-bold text-slate-900">
                                <MinorUnitFormatter amount={selectedCustomer.balances[asset] || '0'} assetCode={asset} showCode={false} />
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Issued Blockchain Addresses</h4>
                        <div className="space-y-2">
                          {selectedCustomer.wallets.map((w) => (
                            <div key={w.chain} className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold uppercase text-indigo-300">{w.chain}</span>
                                <button
                                  onClick={() =>
                                    setQrData({
                                      title: `${w.chain} Address`,
                                      subtitle: `Customer: ${selectedCustomer.name}`,
                                      payload: w.address,
                                    })
                                  }
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Scan QR</span>
                                </button>
                              </div>
                              <p className="font-mono text-xs text-emerald-400 break-all">{w.address}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Activity & Transactions */}
                  {profileTab === 'activity' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Transaction History ({customerTransactions.length})</h4>
                      {customerTransactions.length > 0 ? (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                          {customerTransactions.map((txn) => (
                            <div key={txn.id} className="p-4 flex items-center justify-between hover:bg-slate-50 fast-transition">
                              <div className="flex items-center gap-3">
                                <AssetIcon code={txn.asset_code} className="w-7 h-7" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900 uppercase">{txn.kind.replace('_', ' ')}</span>
                                    <CorrelationBadge correlationId={txn.correlation_id} />
                                  </div>
                                  <span className="text-[11px] font-mono text-slate-400 block">{new Date(txn.created_at).toLocaleString()}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-xs font-bold text-slate-900">
                                  <MinorUnitFormatter amount={txn.amount} assetCode={txn.asset_code} />
                                </div>
                                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded mt-0.5 uppercase border ${
                                  txn.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {txn.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                          No transactions recorded for this customer yet.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Deposit Intents */}
                  {profileTab === 'intents' && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Dynamic Deposit Intents ({customerIntents.length})</h4>
                      {customerIntents.length > 0 ? (
                        <div className="space-y-3">
                          {customerIntents.map((intent) => (
                            <div key={intent.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AssetIcon code={intent.asset_code} className="w-5 h-5" />
                                  <span className="font-mono font-bold text-xs text-slate-900">{intent.id}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                                  intent.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : intent.status === 'underpaid'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {intent.status}
                                </span>
                              </div>

                              <div className="text-xs text-slate-700 space-y-1 font-mono">
                                <div>Bank Rail: <strong>{intent.bank_name}</strong></div>
                                <div>Virtual Account: <strong>{intent.account_number}</strong></div>
                                <div>Expected Amount: <strong><MinorUnitFormatter amount={intent.expected_amount} assetCode={intent.asset_code} /></strong></div>
                              </div>

                              <div className="pt-2 flex justify-end">
                                <button
                                  onClick={() =>
                                    setQrData({
                                      title: `Dynamic VA: ${intent.account_number}`,
                                      subtitle: `${intent.bank_name} · ${intent.account_name}`,
                                      payload: intent.qr_payload || `NGN:${intent.account_number}:Lenco:${intent.expected_amount}`,
                                    })
                                  }
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Scan QR Payment</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                          No active or historical deposit intents issued for this customer.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QrCodeModal
        isOpen={Boolean(qrData)}
        title={qrData?.title || ''}
        subtitle={qrData?.subtitle || ''}
        qrPayload={qrData?.payload || ''}
        onClose={() => setQrData(null)}
      />

      {/* Manual Deposit Intent Creator Modal */}
      {showIntentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs fast-transition">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Issue Manual NGN Deposit Intent</h3>
            <p className="text-xs text-slate-500 mb-4">Target: {showIntentModal.name}</p>

            <form onSubmit={handleIntentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Expected Deposit Amount (NGN)
                </label>
                <input
                  type="number"
                  required
                  value={intentAmountInput}
                  onChange={(e) => setIntentAmountInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIntentModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Issue Intent & Generate QR Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Balance Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs fast-transition">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Manual Ledger Balance Adjustment</h3>
            <p className="text-xs text-slate-500 mb-4">Target: {showAdjustModal.name} ({showAdjustModal.id})</p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Asset</label>
                  <select
                    value={adjustAsset}
                    onChange={(e) => setAdjustAsset(e.target.value as AssetCode)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    <option value="NGN">NGN</option>
                    <option value="USDT">USDT</option>
                    <option value="ETH">ETH</option>
                    <option value="BTC">BTC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Amount</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={adjustAmountInput}
                    onChange={(e) => setAdjustAmountInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Mandatory Audit Reason
                </label>
                <textarea
                  rows={3}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="State reason for manual credit/debit adjustment..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Post Ledger Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Freeze Confirmation Modal */}
      {freezeModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs fast-transition">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {freezeModalCustomer.status === 'active' ? 'Freeze Customer Account' : 'Unfreeze Customer Account'}
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Action target: <strong>{freezeModalCustomer.name}</strong> ({freezeModalCustomer.id}).
            </p>

            <form onSubmit={handleFreezeConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Mandatory Audit Reason
                </label>
                <textarea
                  rows={3}
                  required
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="State reason for customer account freeze..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFreezeModalCustomer(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Confirm & Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
