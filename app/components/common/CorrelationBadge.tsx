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
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:border-slate-300 fast-transition cursor-pointer ${className}`}
    >
      <span>{correlationId}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
      )}
    </button>
  );
}
