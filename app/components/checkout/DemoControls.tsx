'use client';

import React, { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { PaymentSession } from '../../lib/paymentSessions';
import { markCompleted, markExpired, markUnderpaid, restartSession } from '../../lib/checkoutDemo';

interface DemoControlsProps {
  session: PaymentSession;
}

/**
 * Presenter overrides. The session also advances on a timer (useDemoDriver),
 * so this is here to cut ahead or jump to a state the clock won't reach —
 * notably expiry, which is a real 30 minutes away.
 *
 * Deliberately styled as scaffolding, not product. Hidden with ?demo=0.
 */
export default function DemoControls({ session }: DemoControlsProps) {
  const [open, setOpen] = useState(false);

  const settled =
    session.status === 'completed' ||
    session.status === 'underpaid' ||
    session.status === 'expired';

  const actions: { label: string; run: () => void; disabled: boolean }[] = [
    { label: 'Mark paid', run: () => markCompleted(session), disabled: settled },
    { label: 'Mark short', run: () => markUnderpaid(session), disabled: settled },
    { label: 'Expire', run: () => markExpired(session), disabled: settled },
    { label: 'Reset', run: () => restartSession(session), disabled: false },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {open ? (
        <div className="w-56 rounded-xl border border-dashed border-slate-400 dark:border-slate-600 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-sm shadow-lg p-3">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Demo controls
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Hide demo controls"
              className="w-7 h-7 -mr-1 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e1e22] cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {actions.map(({ label, run, disabled }) => (
              <button
                key={label}
                type="button"
                onClick={run}
                disabled={disabled}
                className="min-h-9 px-2 rounded-md border border-slate-200 dark:border-[#2a2a30] text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e1e22] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>

          <p className="mt-2.5 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            Otherwise settles on its own after ~15s.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-10 px-3 inline-flex items-center gap-2 rounded-full border border-dashed border-slate-400 dark:border-slate-600 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-sm shadow-sm text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Demo
        </button>
      )}
    </div>
  );
}
