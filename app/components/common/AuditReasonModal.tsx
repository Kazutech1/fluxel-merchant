'use client';

import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface AuditReasonModalProps {
  isOpen: boolean;
  title: string;
  actionText: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function AuditReasonModal({
  isOpen,
  title,
  actionText,
  onClose,
  onConfirm,
}: AuditReasonModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A valid audit reason is required for platform administrative actions.');
      return;
    }
    setError('');
    onConfirm(reason);
    setReason('');
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
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 font-medium">Audit Trail Logging Required</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Reason / Justification Note
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the reason for this action (e.g. Compliance request, suspected fraud)..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white fast-transition"
              autoFocus
            />
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
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs hover:shadow fast-transition"
            >
              {actionText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
