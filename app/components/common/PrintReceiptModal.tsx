'use client';

import React from 'react';
import { Transaction } from '../../types/dashboard';
import MinorUnitFormatter from './MinorUnitFormatter';
import { Printer, X, CheckCircle2, ShieldCheck } from 'lucide-react';

interface PrintReceiptModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  businessName: string;
  onClose: () => void;
}

export default function PrintReceiptModal({
  isOpen,
  transaction,
  businessName,
  onClose,
}: PrintReceiptModalProps) {
  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs fast-transition">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-8 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 fast-transition print:hidden cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Receipt Layout */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <img src="/fluxel_logo.png" alt="Fluxel Logo" className="w-10 h-10 rounded-lg border border-slate-300" />
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-wider">FLUXEL</h3>
                <p className="text-[10px] text-slate-500 font-mono">FINANCIAL SETTLEMENT RECEIPT</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-900 block">{businessName}</span>
              <span className="text-[10px] text-slate-500 font-mono">CORRELATION RECEIPT</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-bold uppercase">Transaction ID</span>
              <span className="font-mono font-bold text-slate-900">{transaction.id}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-bold uppercase">Correlation ID</span>
              <span className="font-mono text-slate-800">{transaction.correlation_id}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-bold uppercase">Transaction Kind</span>
              <span className="font-bold text-slate-900 uppercase">{transaction.kind.replace('_', ' ')}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-bold uppercase">Customer / Target</span>
              <span className="font-bold text-slate-900">{transaction.customer_name || 'System Action'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-bold uppercase">Timestamp (UTC)</span>
              <span className="font-mono text-slate-800">{new Date(transaction.created_at).toUTCString()}</span>
            </div>

            {transaction.external_ref && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-bold uppercase">Provider Reference</span>
                <span className="font-mono text-slate-800 break-all">{transaction.external_ref}</span>
              </div>
            )}
          </div>

          {/* Amount Box */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400">Total Settled Amount</span>
            <span className="text-xl font-bold text-emerald-400">
              <MinorUnitFormatter amount={transaction.amount} assetCode={transaction.asset_code} />
            </span>
          </div>

          {/* Print Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 print:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg fast-transition"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-2 fast-transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
