'use client';

import React from 'react';
import { CheckCircle2, Clock3, FileClock, Loader, TriangleAlert } from 'lucide-react';
import { CheckoutStatus } from '../../lib/paymentSessions';

const STYLES: Record<CheckoutStatus, { label: string; className: string; Icon: typeof Clock3 }> = {
  awaiting_payment: {
    label: 'Unpaid',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    Icon: FileClock,
  },
  confirming: {
    label: 'Confirming',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
    Icon: Loader,
  },
  completed: {
    label: 'Paid',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    Icon: CheckCircle2,
  },
  underpaid: {
    label: 'Part paid',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    Icon: TriangleAlert,
  },
  expired: {
    label: 'Expired',
    className: 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400',
    Icon: Clock3,
  },
};

export default function StatusPill({ status }: { status: CheckoutStatus }) {
  const { label, className, Icon } = STYLES[status];

  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
