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
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setSubTab('keys')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 fast-transition cursor-pointer shrink-0 ${
            subTab === 'keys'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>API Keys (Bearer Auth - ADR-023)</span>
        </button>

        <button
          onClick={() => setSubTab('webhooks')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 fast-transition cursor-pointer shrink-0 ${
            subTab === 'webhooks'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Webhook className="w-4 h-4" />
          <span>Webhook Endpoints & Logs</span>
        </button>

        <button
          onClick={() => setSubTab('docs')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 fast-transition cursor-pointer shrink-0 ${
            subTab === 'docs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          <span>OpenAPI v1 Specs (utoipa)</span>
        </button>
      </div>

      {/* SubTab 1: API Keys */}
      {subTab === 'keys' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Bearer API Keys ({environment.toUpperCase()})</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                `pk_` publishable keys (GET read-only) · `sk_` secret keys (Full operations, stored as SHA-256 hashes)
              </p>
            </div>

            <button
              onClick={() => setShowCreateKeyModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs fast-transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Generate New API Key</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">Key Name</th>
                  <th className="py-3 px-6">Class</th>
                  <th className="py-3 px-6">Token Preview</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {filteredKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50 fast-transition">
                    <td className="py-4 px-6 font-bold text-slate-900">{key.name}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        key.class === 'sk' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}>
                        {key.class === 'sk' ? 'Secret (sk)' : 'Publishable (pk)'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-900">{key.prefix}••••••••{key.last4}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        key.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {key.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {key.status === 'active' && (
                        <button
                          onClick={() => onRevokeApiKey(key.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold text-xs fast-transition cursor-pointer"
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
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Configured Webhook Endpoints</h3>
            <div className="space-y-3">
              {webhooks.map((wh) => (
                <div key={wh.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <span className="font-mono font-bold text-slate-900 break-all">{wh.url}</span>
                    <p className="text-[11px] text-slate-500 font-mono">Secret: {wh.secret}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onRotateWebhookSecret(wh.id)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotate Secret</span>
                    </button>
                    <button
                      onClick={() => onRequestTestFireWebhook(wh)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Test Fire</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Outbound Webhook Delivery Logs</h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left min-w-[550px]">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-4">Event & ID</th>
                    <th className="py-2.5 px-4">HTTP Status</th>
                    <th className="py-2.5 px-4">Attempt Count</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono text-slate-800">
                  {deliveries.map((del) => (
                    <tr key={del.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold">{del.event_type}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          del.http_status === 200 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          HTTP {del.http_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{del.attempts} / 5</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(del.created_at).toLocaleTimeString()}</td>
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
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs">
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
            <h4 className="text-sm font-bold text-indigo-950">utoipa Rust OpenAPI v3.1 Specifications</h4>
            <p className="text-indigo-900/80">
              The Fluxel API schema is automatically generated from Rust type annotations using `utoipa` crate.
            </p>
            <a
              href="https://fluxel-system.netlify.app/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs fast-transition"
            >
              <span>Launch Interactive OpenAPI Swagger UI</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Create Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Generate Bearer API Key</h3>
            <p className="text-xs text-slate-500 mb-4">Environment: {environment.toUpperCase()}</p>

            <form onSubmit={handleCreateKeySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Key Name / Description
                </label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Mobile App Storefront Key"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Key Class
                </label>
                <select
                  value={newKeyClass}
                  onChange={(e) => setNewKeyClass(e.target.value as 'pk' | 'sk')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                >
                  <option value="sk">Secret Key (`sk_${environment}_...`) - Full Operations</option>
                  <option value="pk">Publishable Key (`pk_${environment}_...`) - Read-Only</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateKeyModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
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
