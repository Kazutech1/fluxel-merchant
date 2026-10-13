import type { Txn } from '../../lib/console/models';
import type { Role } from '../../lib/permissions';
import type { AuthBusiness } from '../../types/auth';

export type Page =
  | 'overview'
  | 'transactions'
  | 'customers'
  | 'links'
  | 'refunds'
  | 'disputes'
  | 'reports'
  | 'developers'
  | 'settings';

export const PAGES: Page[] = ['overview', 'transactions', 'customers', 'links', 'refunds', 'disputes', 'reports', 'developers', 'settings'];

export const isPage = (v: string): v is Page => (PAGES as string[]).includes(v);

export const PAGE_LABELS: Record<Page, string> = {
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

export type Notify = (message: string, tone?: 'success' | 'error') => void;

/** What every page gets from the shell. `sub` is the hash after the page, e.g. "team" in #settings/team. */
export interface PageProps {
  role: Role | string;
  userEmail: string;
  business: AuthBusiness;
  onBusinessUpdated: (business: AuthBusiness) => void;
  sub: string | null;
  notify: Notify;
  onNavigate: (page: Page, sub?: string) => void;
  onOpenTxn: (txn: Txn) => void;
  onWithdraw: () => void;
}

export const DIRECTION_LABEL: Record<Txn['direction'], string> = {
  in: 'Deposit',
  out: 'Payout',
  transfer: 'Transfer',
};

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
