import type { ConsoleData, Dispute, Invoice, Refund, Role, Subscription, WebhookDelivery } from '../../lib/console/types';
import type { ConsoleActions } from '../../lib/console/useConsoleData';
import type { Tone } from './ui';

export type Page =
  | 'overview'
  | 'transactions'
  | 'customers'
  | 'links'
  | 'invoices'
  | 'subscriptions'
  | 'refunds'
  | 'disputes'
  | 'reports'
  | 'developers'
  | 'settings';

export const PAGES: Page[] = [
  'overview',
  'transactions',
  'customers',
  'links',
  'invoices',
  'subscriptions',
  'refunds',
  'disputes',
  'reports',
  'developers',
  'settings',
];

export const isPage = (v: string): v is Page => (PAGES as string[]).includes(v);

/** What every page gets from the shell. `sub` is the part of the hash after the page, e.g. "team" in #settings/team. */
export interface PageProps {
  data: ConsoleData;
  store: ConsoleActions;
  role: Role;
  sub: string | null;
  notify: (message: string) => void;
  onNavigate: (page: Page, sub?: string) => void;
  onOpenTxn: (id: string) => void;
}

export const canManage = (role: Role) => role === 'owner' || role === 'admin';
export const canMoveMoney = (role: Role) => role !== 'viewer';

/* ------------------------------------------------------------------ */
/* Status → label + tone                                               */
/* ------------------------------------------------------------------ */

export function invoiceStatus(inv: Invoice, now: number): { label: string; tone: Tone } {
  if (inv.status === 'paid') return { label: 'Paid', tone: 'positive' };
  if (inv.status === 'void') return { label: 'Void', tone: 'neutral' };
  if (inv.status === 'draft') return { label: 'Draft', tone: 'neutral' };
  return inv.dueAt < now ? { label: 'Overdue', tone: 'negative' } : { label: 'Awaiting payment', tone: 'pending' };
}

export const SUBSCRIPTION_STATUS: Record<Subscription['status'], { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'positive' },
  past_due: { label: 'Past due', tone: 'negative' },
  paused: { label: 'Paused', tone: 'pending' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const DISPUTE_STATUS: Record<Dispute['status'], { label: string; tone: Tone }> = {
  needs_response: { label: 'Needs response', tone: 'negative' },
  under_review: { label: 'Under review', tone: 'pending' },
  won: { label: 'Won', tone: 'positive' },
  lost: { label: 'Lost', tone: 'neutral' },
  accepted: { label: 'Accepted', tone: 'neutral' },
};

export const REFUND_STATUS: Record<Refund['status'], { label: string; tone: Tone }> = {
  processing: { label: 'Processing', tone: 'pending' },
  successful: { label: 'Successful', tone: 'positive' },
  failed: { label: 'Failed', tone: 'negative' },
};

export function deliveryStatus(d: WebhookDelivery): { label: string; tone: Tone } {
  if (d.status >= 200 && d.status < 300) return { label: String(d.status), tone: 'positive' };
  return { label: d.status === 0 ? 'Timeout' : String(d.status), tone: 'negative' };
}

/** CSV download, shared by every export button. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
