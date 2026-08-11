'use client';

import React from 'react';
import { CircleHelp } from 'lucide-react';
import { PaymentSession } from '../../lib/paymentSessions';
import InvoiceSummary from './InvoiceSummary';

interface CheckoutShellProps {
  session: PaymentSession;
  /**
   * The rail switcher, hoisted above the invoice on phones so it's the first
   * thing in reach. Desktop renders its own copy inside the payment column,
   * where it sits under the heading.
   */
  mobileTabs?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Invoice on the left, payment action on the right, split by a hairline on
 * desktop and stacked on a phone.
 */
export default function CheckoutShell({ session, mobileTabs, children }: CheckoutShellProps) {
  return (
    <div className="min-h-svh bg-white dark:bg-[#0d0d0d] text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="shrink-0 border-b border-slate-200 dark:border-[#1e1e22]">
        <div className="h-14 px-4 sm:px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/fluxel_logo.png" alt="" className="w-7 h-7 rounded-md object-cover shrink-0" />
            <span className="text-sm font-semibold tracking-tight truncate">
              Fluxel <span className="text-slate-400 dark:text-slate-500 font-normal">Payments</span>
            </span>
          </div>

          <a
            href="#help"
            aria-label="Help"
            className="w-10 h-10 -mr-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#18181b] transition-colors"
          >
            <CircleHelp className="w-[18px] h-[18px]" />
          </a>
        </div>
      </header>

      {mobileTabs && <div className="lg:hidden px-5 sm:px-8 pt-5">{mobileTabs}</div>}

      <div className="flex-1 lg:grid lg:grid-cols-2">
        <section
          aria-label="Invoice"
          className="px-5 py-4 sm:px-8 lg:px-12 lg:py-14 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#1e1e22]"
        >
          <div className="lg:ml-auto lg:max-w-md">
            <InvoiceSummary session={session} />
          </div>
        </section>

        <section
          aria-label="Payment"
          className="px-5 py-8 sm:px-8 lg:px-12 lg:py-14 pb-[max(2rem,env(safe-area-inset-bottom))]"
        >
          <div className="lg:max-w-md">{children}</div>
        </section>
      </div>
    </div>
  );
}
