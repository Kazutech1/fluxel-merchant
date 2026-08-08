'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CorrelationBadgeProps {
  correlationId: string;
  className?: string;
}

export default function CorrelationBadge({ correlationId, className = '' }: CorrelationBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(correlationId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      title="Click to copy correlation_id"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:border-slate-300 fast-transition cursor-pointer max-w-[150px] sm:max-w-none min-w-0 ${className}`}
    >
      <span className="truncate">{correlationId}</span>
      {copied ? (
        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
      ) : (
        <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600 shrink-0" />
      )}
    </button>
  );
}
