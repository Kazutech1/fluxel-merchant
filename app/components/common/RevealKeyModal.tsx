'use client';

import React, { useState } from 'react';
import { KeyRound, Copy, Check, AlertTriangle } from 'lucide-react';

interface RevealKeyModalProps {
  isOpen: boolean;
  keyName: string;
  plaintextKey: string;
  onClose: () => void;
}

export default function RevealKeyModal({
  isOpen,
  keyName,
  plaintextKey,
  onClose,
}: RevealKeyModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(plaintextKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs fast-transition">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">API Key Created Successfully</h3>
            <p className="text-xs text-slate-500 font-medium">{keyName}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            Save this secret key in a secure location. It will <strong>never be shown again</strong>. Fluxel stores secret keys as SHA-256 hashes (ADR-023).
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Generated Bearer Secret Key
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={plaintextKey}
              className="w-full px-3 py-2.5 bg-slate-900 text-emerald-400 font-mono text-sm rounded-lg border border-slate-800 select-all"
            />
            <button
              onClick={handleCopy}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shrink-0 shadow-xs fast-transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs fast-transition cursor-pointer"
          >
            I Have Saved My Secret Key
          </button>
        </div>
      </div>
    </div>
  );
}
