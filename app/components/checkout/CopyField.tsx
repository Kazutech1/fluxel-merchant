'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyFieldProps {
  label: string;
  value: string;
  /** Rendered instead of the raw value — lets us space out account numbers. */
  display?: React.ReactNode;
  mono?: boolean;
  /** Stacks the value under the label, for long values like wallet addresses. */
  stacked?: boolean;
}

export default function CopyField({ label, value, display, mono = true, stacked = false }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      /* clipboard blocked — the value is selectable as a fallback */
    }
  };

  const valueNode = (
    <span
      className={`${mono ? 'font-mono' : ''} text-slate-900 dark:text-white select-all ${
        stacked ? 'text-sm break-all leading-relaxed' : 'text-sm'
      }`}
    >
      {display ?? value}
    </span>
  );

  if (stacked) {
    return (
      <div className="py-3">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 -mr-2 min-h-11 px-2.5 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e1e22] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {valueNode}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3 min-h-12">
      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0">
        <span className="truncate">{valueNode}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="shrink-0 w-11 h-11 -mr-2.5 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e1e22] transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
