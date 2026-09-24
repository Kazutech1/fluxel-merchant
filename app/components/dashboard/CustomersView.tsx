'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Loader2, RefreshCw, Search, Users } from 'lucide-react';

import { CustomerRequestError, fetchCustomers } from '../../lib/customers';
import type { DashboardCustomer } from '../../types/customers';

/**
 * The customer directory, from `GET /v1/dashboard/customers`.
 *
 * Read-only by design: customers are provisioned by the merchant's own backend
 * against `POST /v1/customers`, which is the API-key surface, not the console.
 * Wallet addresses live there too (`GET /v1/customers/{id}/addresses`), so they
 * are not shown here.
 *
 * The record really is just id / external_id / status — see `types/customers.ts`.
 */
export default function CustomersView() {
  const [customers, setCustomers] = useState<DashboardCustomer[] | null>(null);
  const [error, setError] = useState('');
  const [reloading, setReloading] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchCustomers()
      .then((rows) => {
        if (cancelled) return;
        setCustomers(rows);
        setError('');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCustomers([]);
        setError(
          err instanceof CustomerRequestError ? err.message : 'Could not load customers.'
        );
      })
      .finally(() => {
        if (!cancelled) setReloading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !customers) return customers ?? [];
    return customers.filter(
      (c) => c.external_id.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const copy = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs fast-transition">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer ID or external ID…"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#1c1c20] border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 dark:focus:ring-[#fed700] fast-transition outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setReloading(true);
            setReloadNonce((n) => n + 1);
          }}
          disabled={reloading}
          className="px-4 py-2 bg-slate-100 dark:bg-[#1c1c20] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-2 fast-transition cursor-pointer disabled:opacity-60 shrink-0"
        >
          {reloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Refresh
        </button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Customers are provisioned by your backend against{' '}
        <code className="font-mono">POST /v1/customers</code> with a secret API key. The console
        reads them; it does not create them. Deposit addresses are on the same API surface.
      </p>

      {error && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-x-auto fast-transition">
        {customers === null ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" aria-label="Loading customers" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {customers.length === 0
                ? 'No customers yet. Create one from your backend with POST /v1/customers.'
                : 'No customer matches that search.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#1c1c20] border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-6">External ID</th>
                <th className="py-3 px-6">Customer ID</th>
                <th className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-[#1c1c20] fast-transition"
                >
                  <td className="py-3 px-6 text-sm font-medium text-slate-900 dark:text-white">
                    {c.external_id}
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        {c.id}
                      </code>
                      <button
                        type="button"
                        onClick={() => copy(c.id)}
                        aria-label="Copy customer ID"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 fast-transition cursor-pointer"
                      >
                        {copiedId === c.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                        c.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
