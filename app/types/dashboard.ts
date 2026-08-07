export type AssetCode = 'NGN' | 'USDT' | 'ETH' | 'BTC';

export type Environment = 'live' | 'sandbox';

export type TransactionKind = 'deposit' | 'payout' | 'crypto_withdrawal' | 'internal_transfer';

export type TransactionStatus = 'completed' | 'pending' | 'pending_review' | 'underpaid' | 'rejected';

export type KycTier = 'Tier 1 (Basic)' | 'Tier 2 (Verified ID)' | 'Tier 3 (Enhanced KYB Verified)';

export interface CustomerWallet {
  chain: string;
  address: string;
  qr_code_svg?: string;
}

export interface Customer {
  id: string;
  external_id: string;
  name: string;
  email: string;
  status: 'active' | 'frozen';
  kyc_tier: KycTier;
  bvn_tax_id: string;
  risk_score: number; // 0 to 100
  wallets: CustomerWallet[];
  balances: Record<AssetCode, string>;
  created_at: string;
  transaction_count: number;
}

export interface DepositIntent {
  id: string;
  customer_id: string;
  customer_name: string;
  asset_code: AssetCode;
  expected_amount: string;
  received_amount?: string;
  status: 'pending' | 'completed' | 'underpaid' | 'expired';
  created_at: string;
  expires_at: string;
  account_number: string;
  bank_name: string;
  account_name: string;
  qr_payload?: string;
}

export interface DoubleEntryLeg {
  account_code: string;
  account_name: string;
  type: 'debit' | 'credit';
  amount: string; // minor units
  asset_code: AssetCode;
}

export interface FeeBreakdown {
  gross_amount: string;
  network_fee: string;
  platform_fee: string;
  net_amount: string;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  asset_code: AssetCode;
  amount: string;
  status: TransactionStatus;
  correlation_id: string;
  external_ref?: string;
  customer_id?: string;
  customer_name?: string;
  created_at: string;
  release_at?: string;
  destination?: string;
  double_entry_legs?: DoubleEntryLeg[];
  fee_breakdown?: FeeBreakdown;
  block_confirmations?: { current: number; required: number };
  raw_payload?: Record<string, any>;
}

export interface ApiKey {
  id: string;
  name: string;
  class: 'pk' | 'sk';
  env: Environment;
  prefix: string;
  last4: string;
  created_at: string;
  last_used_at: string;
  status: 'active' | 'revoked';
  ip_allowlist: string[];
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  description: string;
  events: string[];
  status: 'active' | 'disabled';
  secret: string;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  endpoint_url: string;
  event_type: string;
  status: 'delivered' | 'failed' | 'exhausted';
  http_status: number;
  attempts: number;
  payload: string;
  response_body: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Developer' | 'Finance' | 'Support' | 'Read-Only';
  status: 'active' | 'invited';
  totp_enabled: boolean;
  last_active_at: string;
}

export interface UserSession {
  id: string;
  device: string;
  ip_address: string;
  location: string;
  created_at: string;
  last_active_at: string;
  is_current: boolean;
}

export interface BusinessSettings {
  business_name: string;
  merchant_id: string;
  settlement_preference: 'accumulate' | 'auto_transfer';
  static_account_number: string;
  static_bank_name: string;
  static_account_name: string;
  notification_email: string;
  webhook_email: string;
}
