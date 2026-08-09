'use client';

import React, { useState } from 'react';
import { Send, X, CheckCircle2, Clock, Code2 } from 'lucide-react';
import { WebhookEndpoint } from '../../types/dashboard';

interface TestFireWebhookModalProps {
  isOpen: boolean;
  endpoint: WebhookEndpoint | null;
  onClose: () => void;
  onSendTest: (endpointId: string, eventType: string) => void;
}

export default function TestFireWebhookModal({
  isOpen,
  endpoint,
  onClose,
  onSendTest,
}: TestFireWebhookModalProps) {
  const [selectedEvent, setSelectedEvent] = useState('fiat.deposit_intent.completed');
  const [testing, setTesting] = useState(false);
  const [responseLog, setResponseLog] = useState<{ status: number; body: string } | null>(null);

  if (!isOpen || !endpoint) return null;

  const handleTest = () => {
    setTesting(true);
    setResponseLog(null);
    setTimeout(() => {
      setTesting(false);
      setResponseLog({
        status: 200,
        body: JSON.stringify({ status: 'success', received: true, event: selectedEvent, timestamp: new Date().toISOString() }, null, 2),
      });
      onSendTest(endpoint.id, selectedEvent);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs fast-transition">
      <div className="bg-white dark:bg-[#141416] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 fast-transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-amber-500/10 border border-indigo-100 dark:border-amber-500/30 text-indigo-600 dark:text-[#fed700]">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Test Fire Webhook Delivery</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{endpoint.url}</p>
          </div>
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Select Event Type to Dispatch
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700] outline-none"
            >
              <option value="fiat.deposit_intent.completed">fiat.deposit_intent.completed</option>
              <option value="fiat.deposit_intent.underpaid">fiat.deposit_intent.underpaid</option>
              <option value="payout.completed">payout.completed</option>
              <option value="crypto.deposit.confirmed">crypto.deposit.confirmed</option>
              <option value="transfer.completed">transfer.completed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              HMAC Signature Header Format
            </label>
            <div className="bg-slate-900 dark:bg-[#0d0d0d] text-slate-300 font-mono text-xs p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500">X-Fluxel-Signature:</span> t=1723159200,v1=99a8b7c6d5...
            </div>
          </div>

          {responseLog && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Endpoint Response Log</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                  <CheckCircle2 className="w-3.5 h-3.5" /> HTTP {responseLog.status} OK
                </span>
              </div>
              <pre className="bg-slate-900 dark:bg-[#0d0d0d] text-emerald-400 font-mono text-xs p-3 rounded-lg border border-slate-800 overflow-x-auto">
                {responseLog.body}
              </pre>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg fast-transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 text-sm font-bold text-white dark:text-slate-950 bg-indigo-600 dark:bg-[#fed700] hover:bg-indigo-700 dark:hover:bg-amber-300 disabled:opacity-50 rounded-lg shadow-xs hover:shadow flex items-center gap-2 fast-transition cursor-pointer"
          >
            {testing ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{testing ? 'Firing Event...' : 'Dispatch Test Payload'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
