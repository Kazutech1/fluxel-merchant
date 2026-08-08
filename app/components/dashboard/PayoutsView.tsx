'use client';

import React, { useState } from 'react';
import { Transaction, AssetCode } from '../../types/dashboard';
import MinorUnitFormatter from '../common/MinorUnitFormatter';
import CorrelationBadge from '../common/CorrelationBadge';
import AssetIcon from '../common/AssetIcon';
import { ShieldAlert, Send, Building2, Wallet, ArrowUpRight, CheckCircle2, Lock } from 'lucide-react';

interface PayoutsViewProps {
  pendingHolds: Transaction[];
  onInitiatePayout: (payload: {
    type: 'fiat' | 'crypto';
    asset: AssetCode;
    amount: string;
    destination: string;
  }) => void;
}

export default function PayoutsView({ pendingHolds, onInitiatePayout }: PayoutsViewProps) {
  const [payoutType, setPayoutType] = useState<'fiat' | 'crypto'>('fiat');
  const [selectedAsset, setSelectedAsset] = useState<AssetCode>('NGN');
  const [amountInput, setAmountInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [bankCode, setBankCode] = useState('Zenith Bank Plc');
  const [resolvedAccountName, setResolvedAccountName] = useState('');

  const handleAccountBlur = () => {
    if (destinationInput.length === 10 && /^\d+$/.test(destinationInput)) {
      setResolvedAccountName('CHIDI OKAFOR ENTERPRISES (Verified)');
    } else {
      setResolvedAccountName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountInput || !destinationInput) return;

    let minorUnits = '0';
    try {
      const parsed = parseFloat(amountInput);
      if (selectedAsset === 'NGN') minorUnits = Math.round(parsed * 100).toString();
      if (selectedAsset === 'USDT') minorUnits = Math.round(parsed * 1000000).toString();
      if (selectedAsset === 'ETH') minorUnits = BigInt(Math.round(parsed * 1e18)).toString();
      if (selectedAsset === 'BTC') minorUnits = Math.round(parsed * 1e8).toString();
    } catch {
      minorUnits = '5000000';
    }

    onInitiatePayout({
      type: payoutType,
      asset: selectedAsset,
      amount: minorUnits,
      destination: payoutType === 'fiat' ? `${bankCode} - ${destinationInput}` : destinationInput,
    });

    setAmountInput('');
    setDestinationInput('');
    setResolvedAccountName('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Risk Queue Review Holds Notice Banner (Doc 13) */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <h3 className="text-sm font-bold text-amber-950">
              Risk Queue Review Holds Active ({pendingHolds.length})
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 self-start sm:self-auto">
            Doc 13 Compliance Rules
          </span>
        </div>

        <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
          Transactions flagged for elevated volume or step-up verification are held in `pending_review` state. Compliance staff will review held items in the Ops Console.
        </p>

        {pendingHolds.length > 0 && (
          <div className="space-y-2 pt-2">
            {pendingHolds.map((hold) => (
              <div key={hold.id} className="p-3 bg-white/90 rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900">{hold.id}</span>
                    <CorrelationBadge correlationId={hold.correlation_id} />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Customer ID: {hold.customer_id || 'cus_01H9A81B2C3D'}</p>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-100">
                  <div className="text-xs font-bold text-slate-900">
                    <MinorUnitFormatter amount={hold.amount} assetCode={hold.asset_code} />
                  </div>
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded border border-amber-300">
                    Pending Review
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout Initiation Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs max-w-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Initiate Payout / Withdrawal</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Role-Gated Operation (Finance, Admin, Owner) + Step-Up TOTP
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => {
                setPayoutType('fiat');
                setSelectedAsset('NGN');
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md fast-transition flex items-center justify-center gap-1.5 cursor-pointer ${
                payoutType === 'fiat' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Fiat NGN Payout</span>
            </button>

            <button
              onClick={() => {
                setPayoutType('crypto');
                setSelectedAsset('USDT');
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md fast-transition flex items-center justify-center gap-1.5 cursor-pointer ${
                payoutType === 'crypto' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Crypto Withdrawal</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {payoutType === 'fiat' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Destination Bank Rail
                </label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Zenith Bank Plc">Zenith Bank Plc</option>
                  <option value="GTBank (Guaranty Trust)">GTBank (Guaranty Trust)</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="Kuda Bank MFB">Kuda Bank MFB</option>
                  <option value="Moniepoint Microfinance">Moniepoint Microfinance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  10-Digit NGN Account Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={destinationInput}
                  onChange={(e) => setDestinationInput(e.target.value)}
                  onBlur={handleAccountBlur}
                  placeholder="0019283746"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
                {resolvedAccountName && (
                  <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{resolvedAccountName}</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Crypto Asset
                </label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value as AssetCode)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                >
                  <option value="USDT">USDT (Tether - TRC-20)</option>
                  <option value="ETH">ETH (Ethereum Mainnet)</option>
                  <option value="BTC">BTC (Bitcoin Native Segwit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Recipient Blockchain Address
                </label>
                <input
                  type="text"
                  required
                  value={destinationInput}
                  onChange={(e) => setDestinationInput(e.target.value)}
                  placeholder="0x71C7656EC7ab88098defB75187401B5f6d8976F..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Amount to Transfer ({selectedAsset})
            </label>
            <input
              type="number"
              step="any"
              required
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs hover:shadow flex items-center justify-center gap-2 fast-transition cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Submit & Prompt Step-Up TOTP</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
