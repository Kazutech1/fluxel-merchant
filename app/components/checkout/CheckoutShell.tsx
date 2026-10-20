'use client';

import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, Lock } from 'lucide-react';
import { PaymentSession } from '../../lib/paymentSessions';
import { checkoutMoney } from './money';

interface CheckoutShellProps {
  session: PaymentSession;
  children: React.ReactNode;
}

/** First letter of each of the first two words — "Kaz Stores" → "KS". */
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  );
}

function Merchant({ session }: { session: PaymentSession }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span aria-hidden className="size-9 shrink-0 rounded-lg bg-[#fed700] text-[#0a0a0b] inline-flex items-center justify-center text-[13px] font-bold">
        {initials(session.merchant_name)}
      </span>
      <span className="text-sm font-semibold tracking-tight truncate text-slate-900 dark:text-white">{session.merchant_name}</span>
    </div>
  );
}

function OrderLines({ session }: { session: PaymentSession }) {
  const money = (amount: string) => checkoutMoney(amount, session.asset_code);
  return (
    <div className="text-sm">
      <ul className="divide-y divide-slate-200 dark:divide-[#26262b]">
        {session.items.map((item, i) => (
          <li key={`${item.description}-${i}`} className="flex justify-between gap-4 py-3">
            <span className="text-slate-600 dark:text-slate-300">{item.description}</span>
            <span className="tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">{money(item.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between gap-4 border-t border-slate-200 dark:border-[#26262b] pt-3 font-semibold text-slate-900 dark:text-white">
        <span>Total due</span>
        <span className="tabular-nums">{money(session.expected_amount)}</span>
      </div>
      <dl className="mt-5 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex justify-between gap-4">
          <dt>Billed to</dt>
          <dd className="text-slate-800 dark:text-slate-200 truncate">{session.customer_name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Reference</dt>
          <dd className="font-mono text-slate-700 dark:text-slate-300 truncate">{session.order_ref}</dd>
        </div>
      </dl>
    </div>
  );
}

function SecuredBy({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-xs ${className}`}>
      <Lock className="size-3" />
      Secured by
      <img src="/fluxel_logo.png" alt="" className="size-4 rounded object-cover" />
      <span className="font-semibold">Fluxel</span>
    </p>
  );
}

/**
 * Stripe-style split: the merchant, amount and order on a light grey panel
 * to the left; the payment itself on white to the right. On a phone the grey
 * panel becomes a header with the amount always in view and the order behind
 * a toggle. Fluxel gold is an accent only — the merchant badge and timers.
 */
export default function CheckoutShell({ session, children }: CheckoutShellProps) {
  const [orderOpen, setOrderOpen] = useState(false);
  const total = checkoutMoney(session.expected_amount, session.asset_code);
  const back = session.return_url;

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] bg-white dark:bg-[#0d0d0f] text-slate-900 dark:text-slate-100">
      {/* Merchant side */}
      <aside className="relative bg-slate-50 dark:bg-[#111114] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#232327]">
        <div className="relative px-5 sm:px-8 pt-5 pb-5 lg:px-14 lg:pt-12 lg:pb-10 lg:min-h-svh lg:flex lg:flex-col">
          <div className="lg:ml-auto lg:w-full lg:max-w-sm lg:flex-1 lg:flex lg:flex-col">
            <div className="flex items-center justify-between gap-3">
              <Merchant session={session} />
              {back && (
                <a href={back} className="hidden lg:inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <ArrowLeft className="size-3.5" />
                  Back
                </a>
              )}
            </div>

            <div className="mt-6 lg:mt-14">
              <p className="text-sm text-slate-500 dark:text-slate-400">Amount due</p>
              <p className="mt-1 text-[2.25rem] lg:text-[2.75rem] leading-none font-semibold tracking-tight tabular-nums break-words text-slate-900 dark:text-white">{total}</p>
            </div>

            {/* Phones: the order sits behind a toggle so the payment stays near the top. */}
            <button
              type="button"
              onClick={() => setOrderOpen((v) => !v)}
              aria-expanded={orderOpen}
              aria-controls="order-lines"
              className="lg:hidden mt-4 -mx-1 px-1 min-h-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              {orderOpen ? 'Hide order' : 'View order'}
              <ChevronDown className={`size-4 transition-transform duration-150 ${orderOpen ? 'rotate-180' : ''}`} />
            </button>
            <div id="order-lines" className={`${orderOpen ? 'block' : 'hidden'} lg:block mt-4 lg:mt-12`}>
              <OrderLines session={session} />
            </div>

            <SecuredBy className="hidden lg:flex mt-auto pt-12 text-slate-400 dark:text-slate-500 [&_span]:text-slate-600 dark:[&_span]:text-slate-300" />
          </div>
        </div>
      </aside>

      {/* Payment side */}
      <main className="px-5 sm:px-8 lg:px-14 py-7 lg:py-12 lg:min-h-svh lg:flex lg:flex-col pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:flex-1 lg:flex lg:flex-col lg:justify-center">
          {children}
        </div>
        <SecuredBy className="lg:hidden mt-8 justify-center text-slate-400 dark:text-slate-500 [&_span]:text-slate-500 dark:[&_span]:text-slate-400" />
      </main>
    </div>
  );
}
