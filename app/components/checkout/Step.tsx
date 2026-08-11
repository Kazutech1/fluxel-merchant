'use client';

import React from 'react';

interface StepProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  /** Omit the connector on the final step. */
  last?: boolean;
  children?: React.ReactNode;
}

/**
 * One rung of the payment instructions: a small badge in the gutter, a hairline
 * connector running down to the next rung, and the step's content beside it.
 */
export default function Step({ icon, title, last = false, children }: StepProps) {
  return (
    <div className="relative flex gap-3">
      {!last && (
        <span
          aria-hidden
          className="absolute left-[13px] top-8 bottom-0 w-px bg-slate-200 dark:bg-[#26262b]"
        />
      )}

      <span className="relative z-10 shrink-0 w-[26px] h-[26px] rounded-lg bg-slate-100 dark:bg-[#1a1a1f] text-slate-500 dark:text-slate-400 flex items-center justify-center">
        {icon}
      </span>

      <div className={`min-w-0 flex-1 ${last ? '' : 'pb-7'}`}>
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-[26px]">{title}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
