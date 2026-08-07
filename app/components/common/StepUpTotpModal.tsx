'use client';

import React, { useState } from 'react';
import { ShieldCheck, X, KeyRound } from 'lucide-react';

interface StepUpTotpModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: (totpCode: string) => void;
}

export default function StepUpTotpModal({
  isOpen,
  title,
  description,
  onClose,
  onConfirm,
}: StepUpTotpModalProps) {
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6 || !/^\d+$/.test(totpCode)) {
      setError('Please enter a valid 6-digit TOTP code.');
      return;
    }
    setError('');
    onConfirm(totpCode);
    setTotpCode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs fast-transition">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 fast-transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 font-medium">Step-Up Security Verification Required</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-5 leading-relaxed">{description}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Authenticator 6-Digit Code (TOTP)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono tracking-widest text-lg font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white fast-transition"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg fast-transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs hover:shadow fast-transition"
            >
              Verify & Execute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
