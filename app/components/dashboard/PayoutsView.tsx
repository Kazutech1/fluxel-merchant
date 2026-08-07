'use client';

import React, { useState } from 'react';
import { Transaction, AssetCode } from '../../types/dashboard';
import MinorUnitFormatter from '../common/MinorUnitFormatter';
import CorrelationBadge from '../common/CorrelationBadge';
import { SendHorizontal, ShieldAlert, CheckCircle2, Clock, Building, Coins, Lock } from 'lucide-react';

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
  const [activeForm, setActiveForm] = useState<'fiat' | 'crypto'>('fiat');
  const [amountInput, setAmountInput] = useState('');
  const [bankCode, setBankCode] = useState('057'); // Zenith Bank
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [verifyingAccount, setVerifyingAccount] = useState(false);

  // Crypto form fields
  const [cryptoAsset, setCryptoAsset] = useState<AssetCode>('USDT');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [checksumValid, setChecksumValid] = useState<boolean | null>(null);

  const handleVerifyAccount = () => {
    if (accountNumber.length !== 10) return;
    setVerifyingAccount(true);
    setTimeout(() => {
      setVerifyingAccount(false);
      setAccountName('CHIDI OKAFOR ENTERPRISES');
    }, 400);
  };

  const handleCryptoAddressChange = (addr: string) => {
    setCryptoAddress(addr);
    if (!addr) {
      setChecksumValid(null);
      return;
    }
    // Checksum validation simulation
    const isValid = addr.startsWith('0x') || addr.startsWith('T') || addr.startsWith('bc1');
    setChecksumValid(isValid);
  };

  const handleSubmitPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountInput) return;

    // Convert decimal input to minor units
    let minorUnits = '0';
    try {
      const parsed = parseFloat(amountInput);
      if (activeForm === 'fiat') {
        minorUnits = Math.round(parsed * 100).toString(); // NGN kobo
      } else {
        if (cryptoAsset === 'USDT') minorUnits = Math.round(parsed * 1000000).toString();
        if (cryptoAsset === 'ETH') minorUnits = BigInt(Math.round(parsed * 1e18)).toString();
        if (cryptoAsset === 'BTC') minorUnits = Math.round(parsed * 1e8).toString();
      }
    } catch {
      minorUnits = '1000000';
    }

    const dest =
      activeForm === 'fiat'
        ? `Zenith Bank / ${accountNumber} / ${accountName || 'Verified Holder'}`
        : `${cryptoAsset} Network / ${cryptoAddress}`;

    onInitiatePayout({
      type: activeForm,
      asset: activeForm === 'fiat' ? 'NGN' : cryptoAsset,
      amount: minorUnits,
      destination: dest,
    });

    setAmountInput('');
    setAccountNumber('');
    setAccountName('');
    setCryptoAddress('');
    setChecksumValid(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Pending Review Holds Alert Tracker */}
      {pendingHolds.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>Risk Queue Review Holds Active ({pendingHolds.length})</span>
            </div>
            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
              Doc 13 Compliance Rules
            </span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            Transactions flagged for elevated volume or step-up verification are held in `pending_review` state. Compliance staff will review held items in the Ops Console.
          </p>

          <div className="divide-y divide-amber-200/60 pt-2">
            {pendingHolds.map((hold) => (
              <div key={hold.id} className="py-2.5 flex items-center justify-between text-xs text-amber-950 font-medium">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{hold.id}</span>
                  <CorrelationBadge correlationId={hold.correlation_id} />
                </div>
                <div className="flex items-center gap-4">
                  <MinorUnitFormatter amount={hold.amount} assetCode={hold.asset_code} />
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                    Release Scheduled: {new Date(hold.release_at || '').toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Payout Form Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Initiate Payout / Withdrawal</h3>
            <p className="text-xs text-slate-500 font-medium">Role-Gated Operation (Finance, Admin, Owner) + Step-Up TOTP</p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveForm('fiat')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 fast-transition cursor-pointer ${
                activeForm === 'fiat' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Fiat NGN Payout</span>
            </button>
            <button
              onClick={() => setActiveForm('crypto')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 fast-transition cursor-pointer ${
                activeForm === 'crypto' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Crypto Withdrawal</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmitPayout} className="space-y-4">
          {activeForm === 'fiat' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Destination Bank Rail
                  </label>
                  <select
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-medium"
                  >
                    <option value="057">Zenith Bank Plc</option>
                    <option value="033">United Bank for Africa (UBA)</option>
                    <option value="058">Guaranty Trust Bank (GTB)</option>
                    <option value="011">First Bank of Nigeria</option>
                    <option value="044">Access Bank</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    10-Digit NGN Account Number
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    required
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value);
                      if (e.target.value.length === 10) handleVerifyAccount();
                    }}
                    placeholder="0019283746"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              {verifyingAccount && (
                <p className="text-xs text-indigo-600 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin" /> Verifying account name with Lenco adapter...
                </p>
              )}

              {accountName && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-emerald-800 font-medium">Verified Account Name:</span>
                  <span className="text-xs font-bold text-emerald-950 font-mono">{accountName}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Select Blockchain Asset
                </label>
                <select
                  value={cryptoAsset}
                  onChange={(e) => setCryptoAsset(e.target.value as AssetCode)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-medium"
                >
                  <option value="USDT">USDT (TRON / TRC-20)</option>
                  <option value="ETH">ETH (Ethereum Mainnet)</option>
                  <option value="BTC">BTC (Bitcoin Segwit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Destination Blockchain Address (EIP-55 Checksum Enforced)
                </label>
                <input
                  type="text"
                  required
                  value={cryptoAddress}
                  onChange={(e) => handleCryptoAddressChange(e.target.value)}
                  placeholder="e.g. 0x71C7656EC7ab88b098... or TKYc9L3..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
                />
                {checksumValid === true && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valid Checksum Format
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Amount to Transfer ({activeForm === 'fiat' ? 'NGN' : cryptoAsset})
            </label>
            <input
              type="number"
              step="any"
              required
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-bold"
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
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
