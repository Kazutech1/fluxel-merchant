/**
 * Business roles and what they may do — Doc 8 §4, verbatim.
 *
 * Shared by the server (the `/api/v1` proxy refuses calls a role may not make)
 * and the client (which hides what a role can't use). The server check is the
 * one that matters; the client only avoids offering dead buttons.
 */

export const ROLES = ['owner', 'admin', 'developer', 'finance', 'support', 'read_only'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  developer: 'Developer',
  finance: 'Finance',
  support: 'Support',
  read_only: 'Read-only',
};

export const ROLE_SUMMARY: Record<Role, string> = {
  owner: 'Everything, including the team and ownership',
  admin: 'Everything except transferring ownership',
  developer: 'Customers, API keys and webhooks',
  finance: 'Moves money: payouts, withdrawals, transfers',
  support: 'Looks up customers and transactions',
  read_only: 'Sees everything, changes nothing',
};

export type Permission =
  | 'customers.read'
  | 'customers.write'
  | 'balances.read'
  | 'transactions.read'
  | 'payouts.write'
  | 'withdrawals.write'
  | 'transfers.write'
  | 'webhooks.manage'
  | 'keys.manage'
  | 'team.manage'
  | 'settings.manage';

const READS: Permission[] = ['customers.read', 'balances.read', 'transactions.read'];

const GRANTS: Record<Role, Permission[] | 'all'> = {
  owner: 'all',
  admin: 'all',
  developer: ['customers.read', 'customers.write', 'webhooks.manage', 'keys.manage', 'transactions.read', 'balances.read'],
  finance: ['payouts.write', 'withdrawals.write', 'transfers.write', 'balances.read', 'transactions.read'],
  support: ['customers.read', 'transactions.read'],
  read_only: READS,
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** Unknown or missing roles get nothing — fail closed. */
export function can(role: string | undefined, permission: Permission): boolean {
  if (!role || !isRole(role)) return false;
  const grants = GRANTS[role];
  return grants === 'all' || grants.includes(permission);
}

/** For the roles table in Settings → Team. `crypto` rows hide when crypto is switched off. */
export const PERMISSION_ROWS: { label: string; permission: Permission; crypto?: boolean }[] = [
  { label: 'See balances', permission: 'balances.read' },
  { label: 'See transactions, refunds and disputes', permission: 'transactions.read' },
  { label: 'See customers and payment links', permission: 'customers.read' },
  { label: 'Create customers, payment links and payment requests', permission: 'customers.write' },
  { label: 'Withdraw to bank (payouts)', permission: 'payouts.write' },
  { label: 'Crypto withdrawals', permission: 'withdrawals.write', crypto: true },
  { label: 'Transfers between customers', permission: 'transfers.write' },
  { label: 'Manage webhooks', permission: 'webhooks.manage' },
  { label: 'Manage API keys', permission: 'keys.manage' },
  { label: 'Business, payout and checkout settings', permission: 'settings.manage' },
  { label: 'Invite and manage the team', permission: 'team.manage' },
];

/**
 * The permission a `/v1` call needs, by method and path. `null` means the
 * route isn't one the console uses — the proxy refuses it rather than guess.
 */
export function permissionForV1(method: string, path: string): Permission | null {
  const m = method.toUpperCase();
  const read = m === 'GET';
  const p = '/' + path.replace(/^\/+|\/+$/g, '');

  if (p === '/balances' || p === '/assets') return read ? 'balances.read' : null;
  if (/^\/(transactions|deposits|refunds|transfers)(\/|$)/.test(p) || p.startsWith('/reports/')) {
    if (read) return 'transactions.read';
    return p === '/transfers' && m === 'POST' ? 'transfers.write' : null;
  }
  if (/^\/disputes(\/|$)/.test(p)) return read ? 'transactions.read' : m === 'POST' ? 'payouts.write' : null;
  if (/^\/(customers|payment-links|fiat-deposit-intents|crypto-deposit-intents)(\/|$)/.test(p)) {
    return read ? 'customers.read' : 'customers.write';
  }
  if (/^\/payout-accounts(\/|$)/.test(p)) return read ? 'balances.read' : 'payouts.write';
  if (/^\/payouts(\/|$)/.test(p)) return read ? 'transactions.read' : 'payouts.write';
  if (/^\/crypto-withdrawals(\/|$)/.test(p)) return read ? 'transactions.read' : 'withdrawals.write';
  if (p === '/banks' || p === '/bank-accounts/resolve') return 'balances.read';
  if (/^\/webhook-(endpoints|deliveries)(\/|$)/.test(p)) return 'webhooks.manage';
  if (p === '/checkout-config' || p.startsWith('/business/')) return read ? 'transactions.read' : 'settings.manage';
  if (p === '/sandbox/simulate/fiat-deposit') return m === 'POST' ? 'customers.write' : null;
  return null;
}
