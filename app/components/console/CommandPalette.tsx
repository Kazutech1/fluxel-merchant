'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';

import { formatMoney } from '../../lib/console/format';
import type { ConsoleData } from '../../lib/console/types';
import type { Page } from './nav';
import { cx } from './ui';
import { txnTitle } from './txn';

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

/** Pages offered in search. Invoices and subscriptions still exist but are hidden for now. */
export const PAGE_LABELS: Partial<Record<Page, string>> = {
  overview: 'Overview',
  transactions: 'Transactions',
  customers: 'Customers',
  links: 'Payment links',
  refunds: 'Refunds',
  disputes: 'Disputes',
  reports: 'Reports',
  developers: 'Developers',
  settings: 'Settings',
};

const SHORTCUTS: [Page, string | undefined, string][] = [
  ['settings', 'payouts', 'Settings · Payouts & withdrawal accounts'],
  ['settings', 'team', 'Settings · Team'],
  ['settings', 'checkout', 'Settings · Checkout'],
  ['settings', 'security', 'Settings · Security'],
  ['settings', 'verification', 'Settings · Verification'],
  ['settings', 'activity', 'Settings · Activity log'],
  ['developers', undefined, 'Developers · API keys'],
  ['developers', 'webhooks', 'Developers · Webhooks'],
];

/** ⌘K: jump to any page, customer, payment, invoice or link. */
export default function CommandPalette({
  open,
  onClose,
  data,
  onNavigate,
  onOpenTxn,
  onWithdraw,
}: {
  open: boolean;
  onClose: () => void;
  data: ConsoleData;
  onNavigate: (page: Page, sub?: string) => void;
  onOpenTxn: (id: string) => void;
  onWithdraw: () => void;
}) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) window.setTimeout(() => input.current?.focus(), 0);
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (...fields: string[]) => !q || fields.some((f) => f.toLowerCase().includes(q));
    const out: Item[] = [];

    out.push(
      ...[
        { id: 'act-withdraw', group: 'Actions', label: 'Withdraw money', run: onWithdraw },
        { id: 'act-link', group: 'Actions', label: 'Create a payment link', run: () => onNavigate('links') },
        { id: 'act-refund', group: 'Actions', label: 'Refund a payment', run: () => onNavigate('refunds') },
      ].filter((i) => match(i.label))
    );

    out.push(
      ...(Object.keys(PAGE_LABELS) as Page[])
        .filter((p) => match(PAGE_LABELS[p]!))
        .map((p) => ({ id: `page-${p}`, group: 'Go to', label: PAGE_LABELS[p]!, run: () => onNavigate(p) }))
    );
    out.push(
      ...SHORTCUTS.filter(([, , label]) => q && match(label)).map(([p, sub, label]) => ({
        id: `short-${label}`,
        group: 'Go to',
        label,
        run: () => onNavigate(p, sub),
      }))
    );

    if (q) {
      out.push(
        ...data.customers
          .filter((c) => match(c.name, c.email))
          .slice(0, 5)
          .map((c) => ({ id: c.id, group: 'Customers', label: c.name, hint: c.email, run: () => onNavigate('customers', c.id) }))
      );
      out.push(
        ...data.transactions
          .filter((t) => match(t.reference, txnTitle(t, data)))
          .slice(0, 5)
          .map((t) => ({
            id: t.id,
            group: 'Transactions',
            label: `${txnTitle(t, data)}`,
            hint: `${t.reference} · ${formatMoney(t.kind === 'payment' ? t.amount : -t.amount, t.currency, { sign: true })}`,
            run: () => onOpenTxn(t.id),
          }))
      );
      out.push(
        ...data.links
          .filter((l) => match(l.title, l.slug))
          .slice(0, 4)
          .map((l) => ({ id: l.id, group: 'Payment links', label: l.title, hint: `pay.fluxel.app/${l.slug}`, run: () => onNavigate('links', l.id) }))
      );
    }
    return out;
  }, [query, data, onNavigate, onOpenTxn, onWithdraw]);

  const active = Math.min(index, Math.max(0, items.length - 1));

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const choose = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    setQuery('');
    item.run();
  };

  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] fx-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Search" className="relative w-full max-w-xl rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden fx-pop-in">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
          <Search className="size-5 text-gold" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, items.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                choose(items[active]);
              }
            }}
            placeholder="Search customers, payments, invoices, pages…"
            aria-label="Search"
            className="flex-1 bg-transparent outline-none text-base sm:text-sm text-ink placeholder:text-ink-3"
          />
          <kbd className="hidden sm:inline-flex h-6 px-1.5 items-center rounded border border-line text-[11px] text-ink-3 font-mono">esc</kbd>
        </div>
        <ul ref={list} className="max-h-[55svh] overflow-y-auto py-2" role="listbox">
          {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-3">Nothing matches “{query}”.</li>}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <React.Fragment key={item.id}>
                {header && <li className="px-4 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-ink-3">{header}</li>}
                <li
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => choose(item)}
                  className={cx(
                    'mx-2 flex items-center gap-3 h-10 px-3 rounded-lg cursor-pointer text-sm',
                    i === active ? 'bg-gold-soft text-ink' : 'text-ink-2'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className={i === active ? 'font-medium' : ''}>{item.label}</span>
                    {item.hint && <span className="ml-2 text-xs text-ink-3">{item.hint}</span>}
                  </span>
                  {i === active && <CornerDownLeft className="size-4 text-gold" />}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
