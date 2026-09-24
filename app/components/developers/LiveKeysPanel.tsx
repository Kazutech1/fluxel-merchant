'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Lock, Plus, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';

import { BusinessRequestError, createApiKey, fetchApiKeys, revokeApiKey } from '../../lib/business';
import type { AuthBusiness } from '../../types/auth';
import type { ApiKeySummary, CreatedApiKey, KeyClass, KeyEnv } from '../../types/business';

interface LiveKeysPanelProps {
  business: AuthBusiness;
}

const CLASSES: { value: KeyClass; label: string; hint: string }[] = [
  { value: 'secret', label: 'Secret (sk_)', hint: 'Full access — customers, payouts, withdrawals.' },
  { value: 'publishable', label: 'Publishable (pk_)', hint: 'Read-only routes.' },
];

export default function LiveKeysPanel({ business }: LiveKeysPanelProps) {
  const [keyClass, setKeyClass] = useState<KeyClass>('secret');
  const [env, setEnv] = useState<KeyEnv>('test');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  /**
   * Active keys from `GET /v1/dashboard/keys`. `null` while loading.
   * Revoked keys are filtered out server-side, so this list is always current.
   */
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [listError, setListError] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  /**
   * Plaintexts from this session's creations. The API returns each one once
   * and stores only a SHA-256 hash, so they cannot be re-read — they are kept
   * beside the list until the page is left.
   */
  const [created, setCreated] = useState<CreatedApiKey[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const liveLocked = !business.tier_1;

  useEffect(() => {
    let cancelled = false;
    fetchApiKeys()
      .then((rows) => {
        if (cancelled) return;
        setKeys(rows);
        setListError('');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setKeys([]);
        setListError(
          err instanceof BusinessRequestError ? err.message : 'Could not load API keys.'
        );
      });
    return () => { cancelled = true; };
  }, [reloadNonce]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const key = await createApiKey(keyClass, env);
      setCreated((rows) => [key, ...rows]);
      setReloadNonce((n) => n + 1);
    } catch (err) {
      setError(
        err instanceof BusinessRequestError ? err.message : 'Something went wrong. Try again.'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    setListError('');
    try {
      await revokeApiKey(id);
      setKeys((rows) => (rows ?? []).filter((k) => k.id !== id));
      setCreated((rows) => rows.filter((k) => k.id !== id));
      setConfirming(null);
    } catch (err) {
      setListError(
        err instanceof BusinessRequestError ? err.message : 'Could not revoke that key.'
      );
    } finally {
      setRevoking(null);
    }
  };

  const copy = (key: CreatedApiKey) => {
    navigator.clipboard.writeText(key.plaintext).then(() => {
      setCopiedId(key.id);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Create ------------------------------------------------------- */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Create an API key</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          <code className="font-mono">POST /v1/dashboard/keys</code>. The plaintext is returned
          once and stored only as a SHA-256 hash. A business may hold 2 active keys per class per
          environment — revoke one below to free a slot.
        </p>

        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Key class
              </label>
              <div className="space-y-2">
                {CLASSES.map((c) => (
                  <label
                    key={c.value}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <input
                      type="radio"
                      name="key-class"
                      checked={keyClass === c.value}
                      onChange={() => setKeyClass(c.value)}
                      disabled={creating}
                      className="mt-0.5 size-4"
                    />
                    <span>
                      <span className="block text-xs font-bold text-slate-900 dark:text-white">
                        {c.label}
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        {c.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Environment
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
                  <input
                    type="radio"
                    name="key-env"
                    checked={env === 'test'}
                    onChange={() => setEnv('test')}
                    disabled={creating}
                    className="mt-0.5 size-4"
                  />
                  <span>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">
                      Test
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      The API calls this <code className="font-mono">test</code>, not sandbox.
                    </span>
                  </span>
                </label>

                <label
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 ${
                    liveLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="key-env"
                    checked={env === 'live'}
                    onChange={() => setEnv('live')}
                    disabled={creating || liveLocked}
                    className="mt-0.5 size-4"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                      Live
                      {liveLocked && <Lock className="w-3 h-3 text-slate-400" />}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      {liveLocked
                        ? 'Needs KYB approval. The API would issue the key, but every call with it is rejected.'
                        : 'Real money movement.'}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2.5 text-xs font-bold text-white dark:text-slate-950 bg-indigo-600 dark:bg-[#fed700] hover:bg-indigo-700 dark:hover:bg-amber-300 rounded-lg inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {creating ? 'Creating…' : 'Create key'}
          </button>
        </form>
      </div>

      {/* One-time plaintexts ------------------------------------------ */}
      {created.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
            <TriangleAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 dark:text-amber-300 leading-relaxed">
              Copy these now. Only a SHA-256 hash is stored, so a key cannot be shown again once
              you leave this page.
            </p>
          </div>

          {created.map((k) => (
            <div
              key={k.id}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-[#1c1c20] border border-slate-200 dark:border-slate-800"
            >
              <code className="flex-1 text-[11px] font-mono text-slate-900 dark:text-white break-all">
                {k.plaintext}
              </code>
              <button
                type="button"
                onClick={() => copy(k)}
                aria-label="Copy API key"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 fast-transition cursor-pointer shrink-0"
              >
                {copiedId === k.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active keys ---------------------------------------------------- */}
      <div className="rounded-xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Active keys</h4>
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {listError && (
          <p role="alert" className="px-4 py-3 text-xs text-rose-600 dark:text-rose-400">
            {listError}
          </p>
        )}

        {keys === null ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" aria-label="Loading keys" />
          </div>
        ) : keys.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
            No active keys.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {keys.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <KeyRound className="w-4 h-4 text-indigo-600 dark:text-[#fed700] shrink-0" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {k.display_prefix}••••{k.last4}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1c1c20] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                  {k.key_class} · {k.env}
                </span>
                <code className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
                  {k.id}
                </code>

                <div className="ml-auto shrink-0">
                  {confirming === k.id ? (
                    <span className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">
                        Revoke permanently?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevoke(k.id)}
                        disabled={revoking === k.id}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                      >
                        {revoking === k.id && (
                          <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                        )}
                        Revoke
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(k.id)}
                      aria-label="Revoke key"
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 fast-transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
