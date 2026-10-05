'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';

import { formatRelative } from '../../lib/console/format';
import type { Notice } from '../../lib/console/types';
import { cx } from './ui';

export default function NotificationsMenu({
  notices,
  onOpen,
  onMarkAllRead,
}: {
  notices: Notice[];
  onOpen: (href: string) => void;
  onMarkAllRead: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const unread = notices.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative size-9 inline-flex items-center justify-center rounded-lg text-ink-2 hover:text-ink hover:bg-subtle cursor-pointer"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-brand text-brand-ink text-[10px] font-bold inline-flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface shadow-2xl overflow-hidden fx-pop-in z-50">
          <div className="flex items-center justify-between px-4 h-12 border-b border-line">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={onMarkAllRead} className="text-xs text-ink-3 hover:text-ink cursor-pointer">
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-[60svh] overflow-y-auto divide-y divide-line">
            {notices.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-3">You’re all caught up.</li>}
            {notices.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (n.href) onOpen(n.href);
                  }}
                  className="w-full flex gap-3 px-4 py-3 text-left hover:bg-subtle cursor-pointer"
                >
                  <span aria-hidden className={cx('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand')} />
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-sm', n.read ? 'text-ink-2' : 'text-ink font-medium')}>{n.title}</span>
                    <span className="block text-xs text-ink-3 truncate">{n.body}</span>
                    <span className="block mt-0.5 text-[11px] text-ink-3">{formatRelative(n.at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
