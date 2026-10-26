'use client';

/**
 * One hook per thing the console reads, through the shared cache.
 * `invalidate('customers')` refreshes everything keyed under customers.
 */

import { ConsoleError, dash, useResource, v1 } from './client';
import { cryptoDisabled, isFiatAsset } from '../features';
import type {
  ApiTransaction,
  Asset,
  Balance,
  Bank,
  CheckoutConfig,
  Customer,
  CustomerAddress,
  DashboardKey,
  DashboardSession,
  Dispute,
  Page,
  PaymentLink,
  PayoutAccount,
  Refund,
  SettlementSummary,
  StaticAccount,
  TeamMember,
  Txn,
  WebhookDelivery,
  WebhookEndpoint,
} from './models';

const LIMIT = 100;

/** With crypto switched off, only naira rows reach the pages. */
async function fiatOnly<T>(rows: T[], code: (row: T) => string): Promise<T[]> {
  return (await cryptoDisabled()) ? rows.filter((r) => isFiatAsset(code(r))) : rows;
}

export const useAssets = () =>
  useResource(`assets`, async () => fiatOnly(await v1.get<Asset[]>('assets'), (a) => a.asset_code), { fresh: false });
export const useBalances = () =>
  useResource(`balances`, async () => fiatOnly(await v1.get<Balance[]>('balances'), (b) => b.asset_code));

/**
 * Money in, money out and transfers. Fiat rows come back as `kind: "fiat"`
 * whichever way the money moved, so each direction is listed separately and
 * tagged here. The latest 100 of each.
 */
export const useTransactions = () =>
  useResource(`transactions`, async (): Promise<Txn[]> => {
    const [deposits, payouts, transfers] = await Promise.all([
      v1.get<Page<ApiTransaction>>('deposits', { limit: LIMIT }),
      v1.get<Page<ApiTransaction>>('transactions', { kind: 'payout', limit: LIMIT }),
      v1.get<Page<ApiTransaction>>('transactions', { kind: 'transfer', limit: LIMIT }),
    ]);
    const tag = (rows: ApiTransaction[], direction: Txn['direction']) => rows.map((t) => ({ ...t, direction }));
    const all = [...tag(deposits.data, 'in'), ...tag(payouts.data, 'out'), ...tag(transfers.data, 'transfer')];
    return (await fiatOnly(all, (t) => t.asset_code)).sort(
      (a, b) => Date.parse(b.created_at ?? '0') - Date.parse(a.created_at ?? '0')
    );
  });

export const useCustomers = () => useResource(`customers`, () => v1.get<Customer[]>('customers'));
export const useCustomerAddresses = (id: string | null) =>
  useResource(id ? `customers:${id}:addresses` : null, () => v1.get<CustomerAddress[]>(`customers/${id}/addresses`));
export const useCustomerBalances = (id: string | null) =>
  useResource(id ? `customers:${id}:balances` : null, async () =>
    fiatOnly(await v1.get<Balance[]>(`customers/${id}/balances`), (b) => b.asset_code)
  );

/** Per-asset sum of every customer's ledger balance, minor units as decimal strings. */
export interface CustomerBalanceTotal {
  asset_code: string;
  available: string;
  pending: string;
  total: string;
  /** Customers holding a non-zero total in this asset. */
  holders: number;
}

const BALANCE_FANOUT = 8;

/**
 * Total held for customers, per asset. The API only exposes balances per
 * customer (`GET /v1/customers/{id}/balances`), so this fans out across the
 * customer list a few at a time and sums. Keyed under `customers` so
 * `invalidate('customers')` refreshes it too.
 */
export const useCustomerBalancesTotal = () =>
  useResource(`customers:balances-total`, async (): Promise<CustomerBalanceTotal[]> => {
    const customers = await v1.get<Customer[]>('customers');
    type Row = { asset_code: string; available?: string; pending?: string; total?: string };
    const sums = new Map<string, { available: bigint; pending: bigint; holders: number }>();
    const big = (s?: string) => {
      try {
        return BigInt(s ?? '0');
      } catch {
        return BigInt(0);
      }
    };

    for (let i = 0; i < customers.length; i += BALANCE_FANOUT) {
      const batch = customers.slice(i, i + BALANCE_FANOUT);
      const results = await Promise.all(batch.map((c) => v1.get<Row[]>(`customers/${c.id}/balances`)));
      for (const rows of results) {
        for (const r of rows ?? []) {
          const available = big(r.available);
          const pending = big(r.pending);
          const entry = sums.get(r.asset_code) ?? { available: BigInt(0), pending: BigInt(0), holders: 0 };
          entry.available += available;
          entry.pending += pending;
          if (available + pending !== BigInt(0)) entry.holders++;
          sums.set(r.asset_code, entry);
        }
      }
    }

    const totals = [...sums.entries()]
      .map(([asset_code, s]) => ({
        asset_code,
        available: s.available.toString(),
        pending: s.pending.toString(),
        total: (s.available + s.pending).toString(),
        holders: s.holders,
      }))
      .sort((a, b) => (a.asset_code === 'NGN' ? -1 : b.asset_code === 'NGN' ? 1 : a.asset_code.localeCompare(b.asset_code)));
    return fiatOnly(totals, (t) => t.asset_code);
  });

export const usePaymentLinks = () =>
  useResource(`links`, async () => (await v1.get<Page<PaymentLink>>('payment-links', { limit: LIMIT })).data);
export const usePayoutAccounts = () => useResource(`payout-accounts`, () => v1.get<PayoutAccount[]>('payout-accounts'));
export const useRefunds = () =>
  useResource(`refunds`, async () => (await v1.get<Page<Refund>>('refunds', { limit: LIMIT })).data);
export const useDisputes = (enabled = true) => useResource(enabled ? 'disputes' : null, () => v1.get<Dispute[]>('disputes'));

export const useWebhookEndpoints = () => useResource(`webhooks`, () => v1.get<WebhookEndpoint[]>('webhook-endpoints'));
export const useWebhookDeliveries = (endpointId: string | null) =>
  useResource(endpointId ? `webhooks:${endpointId}:deliveries` : null, () =>
    v1.get<WebhookDelivery[]>('webhook-deliveries', { endpoint_id: endpointId ?? '' })
  );

export const useCheckoutConfig = () => useResource(`checkout`, () => v1.get<CheckoutConfig>('checkout-config'));
export const useSettlementPreference = () =>
  useResource(`settlement`, () => v1.get<{ mode: 'accumulate' | 'auto_transfer' }>('business/settlement-preference'));
export const useKybTier = () => useResource(`kyb-tier`, () => v1.get<{ tier: number; note: string | null }>('business/kyb-tier'));

/** `null` while the business has no static account yet (the API answers 503 for that). */
export const useStaticAccount = () =>
  useResource(`static-account`, async () => {
    try {
      return await v1.get<StaticAccount>('business/static-account');
    } catch (e) {
      if (e instanceof ConsoleError && e.status === 503) return null;
      throw e;
    }
  });

export const useSettlementSummary = (from: string, to: string) =>
  useResource(`summary:${from}:${to}`, async (): Promise<SettlementSummary> => {
    const s = await v1.get<SettlementSummary>('reports/settlement-summary', { from, to });
    const code = (r: { asset_code: string }) => r.asset_code;
    return {
      deposits: await fiatOnly(s.deposits ?? [], code),
      payouts: await fiatOnly(s.payouts ?? [], code),
      transfers: await fiatOnly(s.transfers ?? [], code),
    };
  });

/** The bank list comes from the payout provider; fall back to CBN codes when it's unreachable. */
export const useBanks = () =>
  useResource(`banks`, async (): Promise<{ banks: Bank[]; fallback: boolean }> => {
    try {
      const raw = await v1.get<unknown>('banks');
      const list = (Array.isArray(raw) ? raw : ((raw as { data?: unknown[] })?.data ?? [])) as Record<string, string>[];
      const banks = list
        .map((b) => ({ code: b.code ?? b.bank_code ?? b.id, name: b.name ?? b.bank_name }))
        .filter((b) => b.code && b.name);
      if (banks.length) return { banks, fallback: false };
    } catch {
      /* fall through */
    }
    return { banks: CBN_BANKS, fallback: true };
  }, { fresh: false });

export const useConsoleMeta = () =>
  useResource('console', () => dash.get<{ keyIds: string[]; apiBase: string }>('console'), { fresh: false });

/** The console's publishable key, for checkout links — minted the first time it's asked for. */
export const usePublishableKey = (enabled = true) =>
  useResource(enabled ? 'console:pk' : null, async () => (await dash.get<{ publishableKey: string }>('console?publishable=1')).publishableKey, { fresh: false });

/* Dashboard-session data */

export const useTeam = () => useResource('team', () => dash.get<TeamMember[]>('team'));
export const useSessions = () => useResource('sessions', () => dash.get<DashboardSession[]>('sessions'));
export const useApiKeys = (enabled = true) => useResource(enabled ? 'api-keys' : null, () => dash.get<DashboardKey[]>('api-keys'));

const CBN_BANKS: Bank[] = [
  { code: '044', name: 'Access Bank' },
  { code: '050', name: 'Ecobank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank' },
  { code: '214', name: 'FCMB' },
  { code: '058', name: 'GTBank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '50211', name: 'Kuda' },
  { code: '50515', name: 'Moniepoint' },
  { code: '999992', name: 'OPay' },
  { code: '999991', name: 'PalmPay' },
  { code: '076', name: 'Polaris Bank' },
  { code: '221', name: 'Stanbic IBTC' },
  { code: '232', name: 'Sterling Bank' },
  { code: '033', name: 'UBA' },
  { code: '032', name: 'Union Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

export const bankName = (code: string, banks: Bank[] = CBN_BANKS) =>
  banks.find((b) => b.code === code)?.name ?? CBN_BANKS.find((b) => b.code === code)?.name ?? `Bank ${code}`;
