'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface DetailFieldProps {
  label: string;
  value: string;
  /** Overrides the rendered text; the copy button always yields `value`. */
  display?: React.ReactNode;
  icon: React.ReactNode;
  mono?: boolean;
  /** Wraps long values (wallet addresses) instead of truncating them. */
  wrap?: boolean;
}

/**
 * A read-only field row: tiny label above the value, a leading glyph, and a
 * copy affordance on the right.
 */
export default function DetailField({
  label,
  value,
  display,
  icon,
  mono = false,
  wrap = false,
}: DetailFieldProps) {
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

  return (
    <div className="relative rounded-lg border border-slate-200 dark:border-[#26262b] bg-white dark:bg-[#131317] px-3 py-2 pr-12">
      <span className="block text-[10px] leading-none text-slate-400 dark:text-slate-500">
        {label}
      </span>

      <div className="mt-1.5 flex items-start gap-2">
        <span className="shrink-0 text-slate-400 dark:text-slate-500 mt-px">{icon}</span>
        <span
          className={`text-sm text-slate-900 dark:text-white select-all ${mono ? 'font-mono' : ''} ${
            wrap ? 'break-all leading-snug' : 'truncate'
          }`}
        >
          {display ?? value}
        </span>
      </div>

      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e1e22] transition-colors cursor-pointer"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
