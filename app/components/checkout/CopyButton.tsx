'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** A labelled copy button big enough to hit on a phone, with a "Copied" tick. */
export default function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          /* clipboard blocked — the value is selectable as a fallback */
        }
      }}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={`shrink-0 h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
        copied
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#1e1e22] dark:text-slate-200 dark:hover:bg-[#26262b]'
      }`}
    >
      {copied ? <Check className="size-3.5" strokeWidth={2.5} /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
