'use client';

import React, { useState } from 'react';
import { Customer, AssetCode } from '../../types/dashboard';
import MinorUnitFormatter from '../common/MinorUnitFormatter';
import { Repeat, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface TransfersViewProps {
  customers: Customer[];
  onInitiateTransfer: (senderId: string, recipientId: string, asset: AssetCode, amount: string) => void;
}

export default function TransfersView({ customers, onInitiateTransfer }: TransfersViewProps) {
  const [senderId, setSenderId] = useState(customers[0]?.id || '');
  const [recipientId, setRecipientId] = useState(customers[1]?.id || '');
  const [asset, setAsset] = useState<AssetCode>('USDT');
  const [amountInput, setAmountInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderId || !recipientId || !amountInput || senderId === recipientId) return;

    let minorUnits = '0';
    try {
      const parsed = parseFloat(amountInput);
      if (asset === 'NGN') minorUnits = Math.round(parsed * 100).toString();
      if (asset === 'USDT') minorUnits = Math.round(parsed * 1000000).toString();
      if (asset === 'ETH') minorUnits = BigInt(Math.round(parsed * 1e18)).toString();
      if (asset === 'BTC') minorUnits = Math.round(parsed * 1e8).toString();
    } catch {
      minorUnits = '1000000';
    }

    onInitiateTransfer(senderId, recipientId, asset, minorUnits);
    setAmountInput('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-2xl mx-auto">
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6 fast-transition">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-amber-500/10 border border-indigo-100 dark:border-amber-500/30 text-indigo-600 dark:text-[#fed700]">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Internal Customer-to-Customer Transfer</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Instant Double-Entry Ledger Posting · Zero Network Fees</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Sender Customer Account
              </label>
              <select
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700]"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Recipient Customer Account
              </label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700]"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Transfer Asset
              </label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value as AssetCode)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700]"
              >
                <option value="USDT">USDT</option>
                <option value="NGN">NGN</option>
                <option value="ETH">ETH</option>
                <option value="BTC">BTC</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Transfer Amount ({asset})
              </label>
              <input
                type="number"
                step="any"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={senderId === recipientId}
              className="w-full py-3 bg-indigo-600 dark:bg-[#fed700] hover:bg-indigo-700 dark:hover:bg-amber-300 disabled:opacity-50 text-white dark:text-slate-950 rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs hover:shadow flex items-center justify-center gap-2 fast-transition cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
              <span>Execute Internal Transfer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
