'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PaymentSession, formatQuote } from '../../lib/paymentSessions';
import { getAssetSymbol } from '../common/MinorUnitFormatter';
import StatusPill from './StatusPill';

/** Locale-pinned so the string is identical wherever it renders. */
function issuedOn(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function InvoiceSummary({ session }: { session: PaymentSession }) {
  // Collapsed by default on phones, where the invoice otherwise sits between
  // the payer and the payment steps. Always open on desktop, where it has its
  // own column and isn't in the way.
  const [open, setOpen] = useState(false);

  const symbol = getAssetSymbol(session.asset_code);
  const money = (amount: string) => `${symbol}${formatQuote(amount, session.asset_code)}`;
  const total = money(session.expected_amount);

  return (
    <div>
      {/* Phones: the whole header row is the toggle, with the total kept in
          view so it never needs expanding just to see what's owed. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="invoice-details"
        className="lg:hidden w-full min-h-12 py-1 flex items-center justify-between gap-3 text-left cursor-pointer"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2.5">
            <span className="text-lg font-semibold tracking-tight">Invoice</span>
            <StatusPill status={session.status} />
          </span>
          {/* Kept in the collapsed row so the payer can confirm it's for them
              without expanding. The detail block below hides its copy on
              mobile, so this never shows twice. */}
          <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300 truncate">
            Billed to <span className="font-medium text-slate-900 dark:text-white">{session.customer_name}</span>
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-base font-semibold tabular-nums">{total}</span>
          <ChevronDown
            aria-hidden
            className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>

      <div className="hidden lg:flex items-start justify-between gap-4">
        <h2 className="text-[2rem] leading-none font-semibold tracking-tight">Invoice</h2>
        <StatusPill status={session.status} />
      </div>

      <div id="invoice-details" className={`${open ? 'block' : 'hidden'} lg:block`}>
        <dl className="mt-5 text-sm text-slate-500 dark:text-slate-400 space-y-1">
          <div>
            <dt className="sr-only">Invoice number</dt>
            <dd className="font-mono">#{session.invoice_no}</dd>
          </div>
          <div>
            <dt className="sr-only">Issued on</dt>
            <dd>Issued on: {issuedOn(session.created_at)}</dd>
          </div>
          <div className="hidden lg:block pt-1">
            <dt className="sr-only">Billed to</dt>
            <dd>
              Billed to:{' '}
              <span className="font-medium text-slate-900 dark:text-white">
                {session.customer_name}
              </span>
            </dd>
          </div>
        </dl>

        <table className="mt-6 lg:mt-8 w-full text-sm">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400">
              <th scope="col" className="text-left font-normal pb-2">
                Services
              </th>
              <th scope="col" className="text-right font-normal pb-2">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="border-t border-slate-200 dark:border-[#1e1e22]">
            {session.items.map((item, index) => (
              <tr key={`${item.description}-${index}`}>
                <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">
                  {item.description}
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {money(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 dark:border-[#1e1e22]">
            <tr className="font-semibold text-slate-900 dark:text-white">
              <th scope="row" className="text-left py-3 pr-4">
                Total amount
              </th>
              <td className="py-3 text-right tabular-nums whitespace-nowrap">{total}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
          Order <span className="font-mono">{session.order_ref}</span>
        </p>
      </div>
    </div>
  );
}
