'use client';

import React from 'react';

interface WaitingIndicatorProps {
  label: string;
  sublabel?: string;
}

export default function WaitingIndicator({ label, sublabel }: WaitingIndicatorProps) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[#1e1e22] px-4 py-3.5"
    >
      <span className="relative flex w-2.5 h-2.5 shrink-0">
        <span className="absolute inline-flex w-full h-full rounded-full bg-amber-400 opacity-60 animate-ping" />
        <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-[#fed700]" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900 dark:text-white">{label}</span>
        {sublabel && (
          <span className="block text-xs text-slate-500 dark:text-slate-400">{sublabel}</span>
        )}
      </span>
    </div>
  );
}
