/**
 * What the Fluxel API actually returns, as the console reads it.
 *
 * Shapes come from the deployed OpenAPI spec (`/api-docs/openapi.json`) and,
 * where it documents a list only as `{message}`, from the handlers in
 * Fluxel-System/api/src/routes/v1. Amounts are decimal strings in minor units
 * (kobo for NGN, wei-style base units for crypto — see `assets[].decimals`).
 */

export type Env = 'test' | 'live';

export interface Page<T> {
  data: T[];
  next_cursor: string | null;
}

export interface Asset {
  asset_code: string;
  chain: string | null;
  decimals: number;
  enabled: boolean;
}

export interface Balance {
  asset_code: string;
  available: string;
  /** Seen on-chain but not yet credited. Customer balances carry it; the business list may not. */
  pending?: string;
  total?: string;
}

/** `/v1/transactions` and `/v1/deposits` rows. */
export interface ApiTransaction {
  id: string;
  kind: 'fiat' | 'crypto' | 'transfer';
  customer_id: string | null;
  asset_code: string;
  amount: string;
  fee: string;
  status: string;
  chain: string | null;
  txid: string | null;
  confirmations: number | null;
  provider: string | null;
  provider_ref: string | null;
  created_at: string | null;
  to_customer_id?: string;
}

/** A transaction with the direction the console works out from where it was listed. */
export interface Txn extends ApiTransaction {
  direction: 'in' | 'out' | 'transfer';
}

export interface Customer {
  id: string;
  external_id: string;
  status: 'active' | 'frozen' | string;
}

export interface CustomerAddress {
  chain: string;
  address: string;
}

export interface PaymentLink {
  id: string;
  customer_id: string;
  deposit_intent_id: string;
  title: string | null;
  description: string | null;
  amount: string;
  asset_code: string;
  redirect_url: string | null;
  voided: boolean;
  status?: string;
}

export interface DepositIntent {
  id: string;
  customer_id: string;
  status: string;
  expected_amount: string;
  amount_received?: string;
  expires_at: string;
  va?: { account_number?: string; account_name?: string; bank_name?: string } | null;
}

export interface PayoutAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_code: string;
  label: string | null;
}

export interface Refund {
  id: string;
  customer_id: string | null;
  amount: string;
  fee: string;
  status: string;
  provider: string | null;
  provider_ref: string | null;
  created_at: string | null;
}

export interface Dispute {
  id: string;
  transaction_id: string;
  reason: string;
  status: string;
  resolution_note: string | null;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_id: string;
  status: string;
  attempts: number;
}

export interface CheckoutConfig {
  display_name: string | null;
  logo_url: string | null;
  success_url: string | null;
  cancel_url: string | null;
  allowed_assets: string[];
}

export interface StaticAccount {
  account_name: string;
  account_number: string;
  bank_name: string;
  status: string;
}

export interface AssetTotal {
  asset_code: string;
  total: string;
}

export interface SettlementSummary {
  deposits: AssetTotal[];
  payouts: AssetTotal[];
  transfers: AssetTotal[];
}

export interface Bank {
  code: string;
  name: string;
}

/* Dashboard-session surface (`/v1/dashboard/*`) */

export interface DashboardKey {
  id: string;
  display_prefix: string;
  last4: string;
  env: string;
  key_class: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: string;
}

export interface DashboardSession {
  id: string;
  created_at: string;
  expires_at: string;
}

/**
 * Merchant-facing events from the API's event catalog (Doc 6;
 * Fluxel-System/crates/shared event names) — what an endpoint can subscribe to.
 */
export const WEBHOOK_EVENT_GROUPS: { label: string; events: string[] }[] = [
  {
    label: 'Naira',
    events: [
      'fiat.deposit.settled',
      'fiat.deposit_intent.underpaid',
      'fiat.deposit_intent.expired',
      'fiat.payout.completed',
      'fiat.payout.failed',
      'fiat.refund.completed',
      'fiat.refund.failed',
    ],
  },
  {
    label: 'Crypto',
    events: [
      'crypto.deposit.detected',
      'crypto.deposit.confirmed',
      'crypto.deposit_intent.fulfilled',
      'crypto.deposit_intent.underpaid',
      'crypto.withdrawal.confirmed',
      'crypto.withdrawal.failed',
    ],
  },
  {
    label: 'Customers & transfers',
    events: ['customer.created', 'customer.frozen', 'customer.unfrozen', 'customer.wallets.ready', 'ledger.transfer.completed'],
  },
  {
    label: 'Business',
    events: ['business.kyb.approved', 'business.kyb.rejected', 'business.settlement_preference.updated'],
  },
];
