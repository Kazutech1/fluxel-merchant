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
      {/* Top Sub-Nav */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setSubTab('keys')}
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 fast-transition cursor-pointer ${
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
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 fast-transition cursor-pointer ${
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
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 fast-transition cursor-pointer ${
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
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Bearer API Keys ({environment.toUpperCase()})</h3>
              <p className="text-xs text-slate-500 font-medium">
                `pk_` publishable keys (GET read-only) · `sk_` secret keys (Full operations, stored as SHA-256 hashes)
              </p>
            </div>

            <button
              onClick={() => setShowCreateKeyModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs fast-transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate New API Key</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">Key Name</th>
                  <th className="py-3 px-6">Class</th>
                  <th className="py-3 px-6">Token Preview</th>
                  <th className="py-3 px-6">Last Used</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {filteredKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50 fast-transition">
                    <td className="py-4 px-6 font-bold text-slate-900">{key.name}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        key.class === 'sk'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {key.class === 'sk' ? 'Secret (sk_)' : 'Publishable (pk_)'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-900">
                      {key.prefix}••••••••••••••••{key.last4}
                    </td>
                    <td className="py-4 px-6 text-slate-500">{new Date(key.last_used_at).toLocaleString()}</td>
                    <td className="py-4 px-6 text-right">
                      {key.status === 'active' ? (
                        <button
                          onClick={() => onRevokeApiKey(key.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold fast-transition cursor-pointer"
                        >
                          Revoke Key
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 2: Webhooks */}
      {subTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Registered Webhook Endpoints</h3>
            <div className="space-y-4">
              {webhooks.map((wh) => (
                <div key={wh.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm font-bold text-slate-900">{wh.url}</span>
                      <p className="text-xs text-slate-500 font-medium">{wh.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onRequestTestFireWebhook(wh)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs fast-transition cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Test Fire</span>
                      </button>

                      <button
                        onClick={() => onRotateWebhookSecret(wh.id)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-bold flex items-center gap-1.5 fast-transition cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Rotate Secret</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div><strong>Signing Secret:</strong> <span className="font-mono bg-slate-200 px-2 py-0.5 rounded">{wh.secret}</span></div>
                    <div><strong>Subscribed Events:</strong> {wh.events.join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Logs */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Webhook Deliveries</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {deliveries.map((del) => (
                <div key={del.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-slate-900 block">{del.event_type}</span>
                    <span className="text-slate-500 text-[11px]">{del.endpoint_url}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] uppercase border ${
                      del.status === 'delivered'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      HTTP {del.http_status} · {del.status}
                    </span>
                    <button
                      onClick={() => onRequestTestFireWebhook(webhooks[0])}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Replay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SubTab 3: Docs */}
      {subTab === 'docs' && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-center space-y-4 max-w-xl mx-auto">
          <ExternalLink className="w-12 h-12 text-indigo-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Fluxel OpenAPI 3.1 Specification</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Machine specifications generated dynamically via Rust `utoipa`. Consumes bearer `pk_` and `sk_` headers with standard JSON error envelopes.
          </p>
          <a
            href="https://fluxel-system.netlify.app/doc5"
            target="_blank"
            rel="noreferrer"
            className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs"
          >
            Launch Interactive OpenAPI Viewer
          </a>
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs fast-transition">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Generate Bearer API Key</h3>
            <form onSubmit={handleCreateKeySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Key Label / Description
                </label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Mobile App Integration"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Key Class (ADR-023)
                </label>
                <select
                  value={newKeyClass}
                  onChange={(e) => setNewKeyClass(e.target.value as 'pk' | 'sk')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-medium"
                >
                  <option value="sk">Secret Key (sk_ - Full Operations & Money Moves)</option>
                  <option value="pk">Publishable Key (pk_ - Read-Only GET Endpoints)</option>
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
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Generate & Reveal Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
