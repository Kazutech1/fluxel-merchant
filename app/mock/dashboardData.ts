import {
  Customer,
  DepositIntent,
  Transaction,
  ApiKey,
  WebhookEndpoint,
  WebhookDelivery,
  TeamMember,
  UserSession,
  BusinessSettings,
} from '../types/dashboard';

export const initialBusinessSettings: BusinessSettings = {
  business_name: 'Acme Fintech Solutions',
  merchant_id: 'biz_01J98X7Y2Z1A3B4C5D6E',
  settlement_preference: 'accumulate',
  static_account_number: '9901482019',
  static_bank_name: 'Lenco MFB (ADR-024)',
  static_account_name: 'FLUXEL / ACME FINTECH LTD',
  notification_email: 'finance@acmefintech.io',
  webhook_email: 'devs@acmefintech.io',
};

export const initialBalances = {
  NGN: '1425000000', // ₦14,250,000.00
  USDT: '45200000000', // $45,200.00 (6 decimals)
  ETH: '12450000000000000000', // 12.45 ETH (18 decimals)
  BTC: '182000000', // 1.82 BTC (8 decimals)
};

export const initialCustomers: Customer[] = [
  {
    id: 'cus_01H9A81B2C3D',
    external_id: 'usr_mkt_9910',
    name: 'Amina Bello',
    email: 'amina.bello@example.com',
    status: 'active',
    kyc_tier: 'Tier 3 (Enhanced KYB Verified)',
    bvn_tax_id: '22190847561',
    risk_score: 12, // Low risk
    transaction_count: 42,
    wallets: [
      { chain: 'EVM (ETH/BSC)', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
      { chain: 'TRON', address: 'TKYc9L3pG54rX8mD12xN7Z9a4B2c1V3W4X' },
      { chain: 'Bitcoin', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
    ],
    balances: {
      NGN: '45000000', // ₦450,000.00
      USDT: '1250000000', // $1,250.00
      ETH: '500000000000000000', // 0.5 ETH
      BTC: '5000000', // 0.05 BTC
    },
    created_at: '2026-08-01T10:14:00Z',
  },
  {
    id: 'cus_02J9B82C3D4E',
    external_id: 'usr_mkt_9911',
    name: 'Chidi Okafor',
    email: 'chidi.okafor@example.com',
    status: 'active',
    kyc_tier: 'Tier 2 (Verified ID)',
    bvn_tax_id: '22881029384',
    risk_score: 28,
    transaction_count: 18,
    wallets: [
      { chain: 'EVM (ETH/BSC)', address: '0x32Be343B94f860124dC4fEe278FDCBD38C102D88' },
      { chain: 'TRON', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
      { chain: 'Bitcoin', address: 'bc1q9v890467f5z8w8m02k4z99f1w1x2y3z4a5b6c' },
    ],
    balances: {
      NGN: '12000000', // ₦120,000.00
      USDT: '450000000', // $450.00
      ETH: '100000000000000000', // 0.1 ETH
      BTC: '0',
    },
    created_at: '2026-08-03T14:22:00Z',
  },
  {
    id: 'cus_03K9C83D4E5F',
    external_id: 'usr_mkt_9912',
    name: 'Devon Vance',
    email: 'devon.vance@globalpay.co',
    status: 'frozen',
    kyc_tier: 'Tier 1 (Basic)',
    bvn_tax_id: '22990182736',
    risk_score: 84, // High risk
    transaction_count: 5,
    wallets: [
      { chain: 'EVM (ETH/BSC)', address: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7' },
      { chain: 'TRON', address: 'TQn9Y2khEsLJW1ChVWFMSMeSTow5KcbLSE' },
    ],
    balances: {
      NGN: '0',
      USDT: '8900000000', // $8,900.00
      ETH: '2000000000000000000', // 2.0 ETH
      BTC: '12000000', // 0.12 BTC
    },
    created_at: '2026-07-28T09:05:00Z',
  },
  {
    id: 'cus_04L9D84E5F6G',
    external_id: 'usr_mkt_9913',
    name: 'Evelyn Reed',
    email: 'evelyn.reed@techfirm.org',
    status: 'active',
    kyc_tier: 'Tier 3 (Enhanced KYB Verified)',
    bvn_tax_id: '22778899001',
    risk_score: 15,
    transaction_count: 29,
    wallets: [
      { chain: 'EVM (ETH/BSC)', address: '0x4585FE77225b41b697C938B018E2Ac67Ac5a20c0' },
      { chain: 'TRON', address: 'TLsV52sRGDBfLGzhQ6srSm9a6JHVutT1jR' },
      { chain: 'Bitcoin', address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4' },
    ],
    balances: {
      NGN: '85000000', // ₦850,000.00
      USDT: '3200000000', // $3,200.00
      ETH: '0',
      BTC: '1500000', // 0.015 BTC
    },
    created_at: '2026-08-05T11:45:00Z',
  },
];

export const initialDepositIntents: DepositIntent[] = [
  {
    id: 'fdi_99A101B2C3',
    customer_id: 'cus_01H9A81B2C3D',
    customer_name: 'Amina Bello',
    asset_code: 'NGN',
    expected_amount: '5000000', // ₦50,000.00
    received_amount: '5000000',
    status: 'completed',
    created_at: '2026-08-07T21:10:00Z',
    expires_at: '2026-08-07T21:40:00Z',
    account_number: '8091124501',
    bank_name: 'Lenco MFB',
    account_name: 'FLUXEL / AMINA BELLO (fdi_99A101)',
    qr_payload: 'NGN:8091124501:Lenco:5000000',
  },
  {
    id: 'fdi_88B202C3D4',
    customer_id: 'cus_02J9B82C3D4E',
    customer_name: 'Chidi Okafor',
    asset_code: 'NGN',
    expected_amount: '12000000', // ₦120,000.00
    received_amount: '9000000', // ₦90,000.00 (underpaid)
    status: 'underpaid',
    created_at: '2026-08-07T22:30:00Z',
    expires_at: '2026-08-07T23:00:00Z',
    account_number: '8091124502',
    bank_name: 'Lenco MFB',
    account_name: 'FLUXEL / CHIDI OKAFOR (fdi_88B202)',
    qr_payload: 'NGN:8091124502:Lenco:12000000',
  },
  {
    id: 'fdi_77C303D4E5',
    customer_id: 'cus_04L9D84E5F6G',
    customer_name: 'Evelyn Reed',
    asset_code: 'NGN',
    expected_amount: '25000000', // ₦250,000.00
    status: 'pending',
    created_at: '2026-08-07T23:15:00Z',
    expires_at: '2026-08-07T23:45:00Z',
    account_number: '8091124509',
    bank_name: 'Lenco MFB',
    account_name: 'FLUXEL / EVELYN REED (fdi_77C303)',
    qr_payload: 'NGN:8091124509:Lenco:25000000',
  },
];

export const initialTransactions: Transaction[] = [
  {
    id: 'txn_101A202B303',
    kind: 'deposit',
    asset_code: 'NGN',
    amount: '5000000', // ₦50,000.00
    status: 'completed',
    correlation_id: 'fx_cor_88a9101b2c3d4e5f',
    external_ref: 'lenco_ref_991827364',
    customer_id: 'cus_01H9A81B2C3D',
    customer_name: 'Amina Bello',
    created_at: '2026-08-07T21:12:00Z',
    fee_breakdown: {
      gross_amount: '5000000',
      network_fee: '25000', // ₦250.00 Lenco fee
      platform_fee: '50000', // ₦500.00 Fluxel fee
      net_amount: '4925000',
    },
    double_entry_legs: [
      { account_code: '1000-01', account_name: 'Lenco Settlement Float (Asset)', type: 'debit', amount: '5000000', asset_code: 'NGN' },
      { account_code: '2000-05', account_name: 'Customer NGN Balance (Liability)', type: 'credit', amount: '4925000', asset_code: 'NGN' },
      { account_code: '4000-01', account_name: 'Platform Processing Revenue (Revenue)', type: 'credit', amount: '75000', asset_code: 'NGN' },
    ],
    raw_payload: {
      provider: 'lenco',
      event: 'virtual_account.credited',
      reference: 'lenco_ref_991827364',
      account_number: '8091124501',
      amount_kobo: 5000000,
    },
  },
  {
    id: 'txn_102B303C404',
    kind: 'payout',
    asset_code: 'NGN',
    amount: '35000000', // ₦350,000.00
    status: 'completed',
    correlation_id: 'fx_cor_77b8202c3d4e5f6g',
    external_ref: 'pay_lenco_771829',
    customer_id: 'cus_02J9B82C3D4E',
    customer_name: 'Chidi Okafor',
    destination: 'Access Bank / 0019283746 / Chidi Okafor',
    created_at: '2026-08-07T19:45:00Z',
    fee_breakdown: {
      gross_amount: '35000000',
      network_fee: '50000',
      platform_fee: '100000',
      net_amount: '34850000',
    },
    double_entry_legs: [
      { account_code: '2000-05', account_name: 'Customer NGN Balance (Liability)', type: 'debit', amount: '35000000', asset_code: 'NGN' },
      { account_code: '1000-01', account_name: 'Lenco Settlement Float (Asset)', type: 'credit', amount: '34850000', asset_code: 'NGN' },
    ],
  },
  {
    id: 'txn_103C404D505',
    kind: 'crypto_withdrawal',
    asset_code: 'USDT',
    amount: '2500000000', // $2,500.00
    status: 'pending_review',
    correlation_id: 'fx_cor_66c7303d4e5f6g7h',
    customer_id: 'cus_04L9D84E5F6G',
    customer_name: 'Evelyn Reed',
    destination: 'TRON / TLsV52sRGDBfLGzhQ6srSm9a6JHVutT1jR',
    created_at: '2026-08-07T22:50:00Z',
    release_at: '2026-08-08T00:50:00Z',
    block_confirmations: { current: 8, required: 19 },
    fee_breakdown: {
      gross_amount: '2500000000',
      network_fee: '1000000', // 1 USDT TRON gas
      platform_fee: '2000000',
      net_amount: '2497000000',
    },
  },
  {
    id: 'txn_104D505E606',
    kind: 'deposit',
    asset_code: 'ETH',
    amount: '1500000000000000000', // 1.5 ETH
    status: 'completed',
    correlation_id: 'fx_cor_55d6404e5f6g7h8i',
    external_ref: '0x9918273645bcde1234567890abcdef1234567890abcdef1234567890abcdef12',
    customer_id: 'cus_01H9A81B2C3D',
    customer_name: 'Amina Bello',
    created_at: '2026-08-07T17:30:00Z',
    block_confirmations: { current: 12, required: 12 },
    double_entry_legs: [
      { account_code: '1000-02', account_name: 'Ethereum Treasury Hot Wallet (Asset)', type: 'debit', amount: '1500000000000000000', asset_code: 'ETH' },
      { account_code: '2000-02', account_name: 'Customer ETH Balance (Liability)', type: 'credit', amount: '1500000000000000000', asset_code: 'ETH' },
    ],
  },
];

export const initialApiKeys: ApiKey[] = [
  {
    id: 'key_01H9A1',
    name: 'Main Storefront Secret Key',
    class: 'sk',
    env: 'live',
    prefix: 'sk_live_',
    last4: '8f9a',
    created_at: '2026-07-25T12:00:00Z',
    last_used_at: '2026-08-07T23:18:00Z',
    status: 'active',
    ip_allowlist: ['192.168.1.1/32', '10.0.0.0/24'],
  },
  {
    id: 'key_02H9A2',
    name: 'Mobile App Read-Only Key',
    class: 'pk',
    env: 'live',
    prefix: 'pk_live_',
    last4: '3b2c',
    created_at: '2026-07-25T12:05:00Z',
    last_used_at: '2026-08-07T23:20:00Z',
    status: 'active',
    ip_allowlist: [],
  },
  {
    id: 'key_03H9A3',
    name: 'Sandbox Integration Test Key',
    class: 'sk',
    env: 'sandbox',
    prefix: 'sk_test_',
    last4: '9901',
    created_at: '2026-07-24T09:30:00Z',
    last_used_at: '2026-08-07T16:45:00Z',
    status: 'active',
    ip_allowlist: [],
  },
];

export const initialWebhookEndpoints: WebhookEndpoint[] = [
  {
    id: 'whe_01J9A101',
    url: 'https://api.acmefintech.io/webhooks/fluxel',
    description: 'Production core ledger listener',
    events: ['fiat.deposit_intent.completed', 'payout.completed', 'crypto.deposit.confirmed', 'transfer.completed'],
    status: 'active',
    secret: 'whsec_99a8b7c6d5e4f3a2b1c09876543210fe',
    created_at: '2026-07-26T14:00:00Z',
  },
  {
    id: 'whe_02J9A202',
    url: 'https://staging.acmefintech.io/webhooks/debug',
    description: 'Staging environment audit listener',
    events: ['*'],
    status: 'active',
    secret: 'whsec_11223344556677889900aabbccddeeff',
    created_at: '2026-08-01T10:00:00Z',
  },
];

export const initialWebhookDeliveries: WebhookDelivery[] = [
  {
    id: 'whd_101A99',
    endpoint_id: 'whe_01J9A101',
    endpoint_url: 'https://api.acmefintech.io/webhooks/fluxel',
    event_type: 'fiat.deposit_intent.completed',
    status: 'delivered',
    http_status: 200,
    attempts: 1,
    payload: JSON.stringify({ event: 'fiat.deposit_intent.completed', id: 'fdi_99A101B2C3', amount: '5000000' }, null, 2),
    response_body: '{"status":"ok","received":true}',
    created_at: '2026-08-07T21:12:02Z',
  },
  {
    id: 'whd_102B88',
    endpoint_id: 'whe_01J9A101',
    endpoint_url: 'https://api.acmefintech.io/webhooks/fluxel',
    event_type: 'fiat.deposit_intent.underpaid',
    status: 'failed',
    http_status: 504,
    attempts: 3,
    payload: JSON.stringify({ event: 'fiat.deposit_intent.underpaid', id: 'fdi_88B202C3D4', amount_received: '9000000' }, null, 2),
    response_body: 'Gateway Timeout (504)',
    created_at: '2026-08-07T22:31:05Z',
  },
];

export const initialTeamMembers: TeamMember[] = [
  {
    id: 'usr_01',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@acmefintech.io',
    role: 'Owner',
    status: 'active',
    totp_enabled: true,
    last_active_at: '2026-08-07T23:25:00Z',
  },
  {
    id: 'usr_02',
    name: 'Michael Chen',
    email: 'm.chen@acmefintech.io',
    role: 'Developer',
    status: 'active',
    totp_enabled: true,
    last_active_at: '2026-08-07T22:14:00Z',
  },
  {
    id: 'usr_03',
    name: 'Tunde Adebayo',
    email: 'tunde.a@acmefintech.io',
    role: 'Finance',
    status: 'active',
    totp_enabled: true,
    last_active_at: '2026-08-07T20:05:00Z',
  },
  {
    id: 'usr_04',
    name: 'Jessica Taylor',
    email: 'jessica.t@acmefintech.io',
    role: 'Support',
    status: 'invited',
    totp_enabled: false,
    last_active_at: 'Never',
  },
];

export const initialUserSessions: UserSession[] = [
  {
    id: 'ses_99A101',
    device: 'Chrome / macOS (14.5)',
    ip_address: '197.210.64.12',
    location: 'Lagos, Nigeria',
    created_at: '2026-08-07T18:00:00Z',
    last_active_at: 'Active Now',
    is_current: true,
  },
  {
    id: 'ses_88B202',
    device: 'Safari / iOS 17.5 (iPhone 15 Pro)',
    ip_address: '102.89.22.45',
    location: 'Lagos, Nigeria',
    created_at: '2026-08-06T09:12:00Z',
    last_active_at: '2026-08-07T14:20:00Z',
    is_current: false,
  },
];
