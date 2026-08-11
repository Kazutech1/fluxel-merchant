'use client';

import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import OtpInput from './OtpInput';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs fast-transition">
      <div className="bg-white dark:bg-[#141416] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 fast-transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-amber-500/10 border border-indigo-100 dark:border-amber-500/30 text-indigo-600 dark:text-[#fed700]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Step-Up Security Verification Required</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">{description}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Authenticator 6-Digit Code (TOTP)
            </label>
            <OtpInput
              label="Authenticator 6-digit code"
              value={totpCode}
              onChange={(code) => {
                setTotpCode(code);
                if (error) setError('');
              }}
              invalid={Boolean(error)}
              autoFocus
            />
            {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg fast-transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-bold text-white dark:text-slate-950 bg-indigo-600 dark:bg-[#fed700] hover:bg-indigo-700 dark:hover:bg-amber-300 rounded-lg shadow-xs hover:shadow fast-transition cursor-pointer"
            >
              Verify & Execute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
