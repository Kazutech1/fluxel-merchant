'use client';

import React, { useState } from 'react';
import { WebhookEndpoint, WebhookDelivery } from '../../types/dashboard';
import type { AuthBusiness } from '../../types/auth';
import LiveKeysPanel from '../developers/LiveKeysPanel';
import { KeyRound, Webhook, RotateCw, Send, ExternalLink, ShieldCheck } from 'lucide-react';

interface DevelopersViewProps {
  business: AuthBusiness;
  webhooks: WebhookEndpoint[];
  deliveries: WebhookDelivery[];
  onRotateWebhookSecret: (endpointId: string) => void;
  onRequestTestFireWebhook: (endpoint: WebhookEndpoint) => void;
}

export default function DevelopersView({
  business,
  webhooks,
  deliveries,
  onRotateWebhookSecret,
  onRequestTestFireWebhook,
}: DevelopersViewProps) {
  // The API Keys tab is real (POST /v1/dashboard/keys). Webhooks below are
  // still demo data — the only webhook route that exists is POST
  // /v1/webhook-endpoints, and it lives on the API-key surface, not here.
  const [subTab, setSubTab] = useState<'keys' | 'webhooks' >('keys');


  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Sub-Nav - Responsive Horizontal Scroll */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setSubTab('keys')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 fast-transition cursor-pointer shrink-0 ${
            subTab === 'keys'
              ? 'bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>API Keys (Bearer Auth - ADR-023)</span>
        </button>

        <button
          onClick={() => setSubTab('webhooks')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 fast-transition cursor-pointer shrink-0 ${
            subTab === 'webhooks'
              ? 'bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Webhook className="w-4 h-4" />
          <span>Outbound Webhooks (HMAC SHA-256)</span>
        </button>

        <button
          onClick={() => setSubTab('webhooks')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 fast-transition cursor-pointer shrink-0 ${
            subTab === 'webhooks'
              ? 'bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>API Reference & Spec (ADR-021)</span>
        </button>
      </div>

      {/* API Keys — real, backed by POST /v1/dashboard/keys */}
      {subTab === 'keys' && <LiveKeysPanel business={business} />}

      {/* SubTab 2: Webhook Endpoints & Deliveries */}
      {subTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs space-y-4 fast-transition">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Configured Webhook Endpoints</h3>
            <div className="space-y-3">
              {webhooks.map((wh) => (
                <div key={wh.id} className="p-4 bg-slate-50 dark:bg-[#1c1c20] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs fast-transition">
                  <div className="space-y-1 min-w-0">
                    <span className="font-mono font-bold text-slate-900 dark:text-white break-all">{wh.url}</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Secret: {wh.secret}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onRotateWebhookSecret(wh.id)}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotate Secret</span>
                    </button>
                    <button
                      onClick={() => onRequestTestFireWebhook(wh)}
                      className="px-3 py-1.5 bg-emerald-600 dark:bg-[#fed700] hover:bg-emerald-700 dark:hover:bg-amber-300 text-white dark:text-slate-950 rounded font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Test Fire</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs space-y-4 fast-transition">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Outbound Webhook Delivery Logs</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left min-w-[550px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#1c1c20] text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-4">Event & ID</th>
                    <th className="py-2.5 px-4">HTTP Status</th>
                    <th className="py-2.5 px-4">Attempt Count</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono text-slate-800 dark:text-slate-200">
                  {deliveries.map((del) => (
                    <tr key={del.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{del.event_type}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          del.http_status === 200 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                        }`}>
                          HTTP {del.http_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{del.attempts} / 5</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{new Date(del.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 3: OpenAPI Specs */}
      {subTab === 'webhooks' && (
        <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4 text-xs fast-transition">
          <div className="p-4 bg-indigo-50 dark:bg-amber-500/10 border border-indigo-200 dark:border-amber-500/30 rounded-xl space-y-2">
            <h4 className="text-sm font-bold text-indigo-950 dark:text-[#fed700]">utoipa Rust OpenAPI v3.1 Specifications</h4>
            <p className="text-indigo-900/80 dark:text-slate-300">
              The Fluxel API schema is automatically generated from Rust type annotations using `utoipa` crate.
            </p>
            <a
              href="https://fluxel-system.netlify.app/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 dark:bg-[#fed700] hover:bg-indigo-700 dark:hover:bg-amber-300 text-white dark:text-slate-950 rounded-lg font-bold text-xs fast-transition"
            >
              <span>Launch Interactive OpenAPI Swagger UI</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

    </div>
  );
}