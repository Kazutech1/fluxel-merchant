'use client';

import React from 'react';
import { Coins, Landmark } from 'lucide-react';

export type MethodTab = 'bank' | 'crypto';

interface MethodTabsProps {
  value: MethodTab;
  onChange: (tab: MethodTab) => void;
  disabled?: boolean;
}

const TABS: { id: MethodTab; label: string; Icon: typeof Landmark }[] = [
  { id: 'bank', label: 'Bank transfer', Icon: Landmark },
  { id: 'crypto', label: 'Pay with crypto', Icon: Coins },
];

export default function MethodTabs({ value, onChange, disabled = false }: MethodTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Payment method"
      className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#131317]"
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`min-h-11 px-3 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              active
                ? 'bg-slate-900 dark:bg-[#fed700] text-white dark:text-slate-950 shadow-sm'
                : 'bg-white dark:bg-[#1a1a1f] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#26262b] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
