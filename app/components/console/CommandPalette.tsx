'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';

import { useAssets, useCustomers, usePaymentLinks, useTransactions } from '../../lib/console/data';
import { formatMinor } from '../../lib/console/money';
import type { Txn } from '../../lib/console/models';
import { can } from '../../lib/permissions';
import { PAGE_LABELS, PAGES, type Page } from './nav';
import { cx } from './ui';
import { txnTitle } from './txn';

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

const SHORTCUTS: [Page, string, string][] = [
  ['settings', 'payouts', 'Settings · Bank accounts & settlement'],
  ['settings', 'verification', 'Settings · Verification (KYB)'],
  ['settings', 'checkout', 'Settings · Checkout'],
  ['settings', 'team', 'Settings · Team'],
  ['settings', 'security', 'Settings · Security'],
  ['developers', 'webhooks', 'Developers · Webhooks'],
];

/** ⌘K: jump to any page, customer, transaction or payment link. */
export default function CommandPalette({
  open,
  role,
  onClose,
  onNavigate,
  onOpenTxn,
  onWithdraw,
}: {
  open: boolean;
  role: string;
  onClose: () => void;
  onNavigate: (page: Page, sub?: string) => void;
  onOpenTxn: (txn: Txn) => void;
  onWithdraw: () => void;
}) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const { data: customers } = useCustomers();
  const { data: txns } = useTransactions();
  const { data: links } = usePaymentLinks();
  const { data: assets } = useAssets();

  useEffect(() => {
    if (open) window.setTimeout(() => input.current?.focus(), 0);
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (...fields: (string | null | undefined)[]) => !q || fields.some((f) => f?.toLowerCase().includes(q));
    const out: Item[] = [];

    const actions: Item[] = [];
    if (can(role, 'payouts.write')) actions.push({ id: 'a-withdraw', group: 'Actions', label: 'Withdraw to bank', run: onWithdraw });
    if (can(role, 'customers.write')) {
      actions.push({ id: 'a-link', group: 'Actions', label: 'Create a payment link', run: () => onNavigate('links', 'new') });
      actions.push({ id: 'a-customer', group: 'Actions', label: 'Add a customer', run: () => onNavigate('customers', 'new') });
    }
    out.push(...actions.filter((a) => match(a.label)));

    out.push(...PAGES.filter((p) => match(PAGE_LABELS[p])).map((p) => ({ id: `p-${p}`, group: 'Go to', label: PAGE_LABELS[p], run: () => onNavigate(p) })));
    if (q) {
      out.push(...SHORTCUTS.filter(([, , l]) => match(l)).map(([p, s, l]) => ({ id: `s-${l}`, group: 'Go to', label: l, run: () => onNavigate(p, s) })));
      out.push(
        ...(customers ?? [])
          .filter((c) => match(c.external_id, c.id))
          .slice(0, 5)
          .map((c) => ({ id: c.id, group: 'Customers', label: c.external_id, hint: c.id, run: () => onNavigate('customers', c.id) }))
      );
      out.push(
        ...(txns ?? [])
          .filter((t) => match(t.id, t.provider_ref, t.txid, txnTitle(t, customers)))
          .slice(0, 5)
          .map((t) => ({
            id: `t-${t.direction}-${t.id}`,
            group: 'Transactions',
            label: txnTitle(t, customers),
            hint: formatMinor(t.amount, t.asset_code, assets, { sign: t.direction !== 'transfer', negative: t.direction === 'out' }),
            run: () => onOpenTxn(t),
          }))
      );
      out.push(
        ...(links ?? [])
          .filter((l) => match(l.title, l.id, l.description))
          .slice(0, 4)
          .map((l) => ({ id: l.id, group: 'Payment links', label: l.title || 'Payment link', hint: formatMinor(l.amount, l.asset_code, assets), run: () => onNavigate('links', l.id) }))
      );
    }
    return out;
  }, [query, role, customers, txns, links, assets, onNavigate, onOpenTxn, onWithdraw]);

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
            placeholder="Search customers, transactions, links, pages…"
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
                  className={cx('mx-2 flex items-center gap-3 h-10 px-3 rounded-lg cursor-pointer text-sm', i === active ? 'bg-gold-soft text-ink' : 'text-ink-2')}
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
