'use client';

import React, { useState } from 'react';
import { ApiKey, WebhookEndpoint, WebhookDelivery, Environment } from '../../types/dashboard';
import { KeyRound, Webhook, Plus, RotateCw, Trash2, Send, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, X } from 'lucide-react';

interface DevelopersViewProps {
  environment: Environment;
  apiKeys: ApiKey[];
  webhooks: WebhookEndpoint[];
  deliveries: WebhookDelivery[];
  onCreateApiKey: (name: string, keyClass: 'pk' | 'sk') => void;
  onRevokeApiKey: (keyId: string) => void;
  onRotateWebhookSecret: (endpointId: string) => void;
  onRequestTestFireWebhook: (endpoint: WebhookEndpoint) => void;
}

export default function DevelopersView({
  environment,
  apiKeys,
  webhooks,
  deliveries,
  onCreateApiKey,
  onRevokeApiKey,
  onRotateWebhookSecret,
  onRequestTestFireWebhook,
}: DevelopersViewProps) {
  const [subTab, setSubTab] = useState<'keys' | 'webhooks' | 'docs'>('keys');
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyClass, setNewKeyClass] = useState<'pk' | 'sk'>('sk');

  const filteredKeys = apiKeys.filter((k) => k.env === environment);

  const handleCreateKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;
    onCreateApiKey(newKeyName, newKeyClass);
    setShowCreateKeyModal(false);
    setNewKeyName('');
  };

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
          onClick={() => setSubTab('docs')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 fast-transition cursor-pointer shrink-0 ${
            subTab === 'docs'
              ? 'bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>API Reference & Spec (ADR-021)</span>
        </button>
      </div>

      {/* SubTab 1: API Keys */}
      {subTab === 'keys' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs fast-transition">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Bearer API Keys ({environment.toUpperCase()})</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                `pk_` publishable keys (GET read-only) · `sk_` secret keys (Full operations, stored as SHA-256 hashes)
              </p>
            </div>

            <button
              onClick={() => setShowCreateKeyModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 dark:bg-[#fed700] hover:bg-indigo-700 dark:hover:bg-amber-300 text-white dark:text-slate-950 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs fast-transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Generate New API Key</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-x-auto fast-transition">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#1c1c20] border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Key Name</th>
                  <th className="py-3 px-6">Class</th>
                  <th className="py-3 px-6">Token Preview</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium">
                {filteredKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 fast-transition">
                    <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{key.name}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        key.class === 'sk' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                      }`}>
                        {key.class === 'sk' ? 'Secret (sk)' : 'Publishable (pk)'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-900 dark:text-slate-200">{key.prefix}••••••••{key.last4}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        key.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                      }`}>
                        {key.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {key.status === 'active' && (
                        <button
                          onClick={() => onRevokeApiKey(key.id)}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded font-semibold text-xs fast-transition cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
      {subTab === 'docs' && (
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

      {/* Create Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#141416] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 relative">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Generate Bearer API Key</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Environment: {environment.toUpperCase()}</p>

            <form onSubmit={handleCreateKeySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Key Name / Description
                </label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Mobile App Storefront Key"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Key Class
                </label>
                <select
                  value={newKeyClass}
                  onChange={(e) => setNewKeyClass(e.target.value as 'pk' | 'sk')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700]"
                >
                  <option value="sk">Secret Key (`sk_${environment}_...`) - Full Operations</option>
                  <option value="pk">Publishable Key (`pk_${environment}_...`) - Read-Only</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateKeyModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-bold text-white dark:text-slate-950 bg-indigo-600 dark:bg-[#fed700] hover:bg-indigo-700 dark:hover:bg-amber-300 rounded-lg shadow-xs cursor-pointer"
                >
                  Generate Key & Step-Up TOTP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
