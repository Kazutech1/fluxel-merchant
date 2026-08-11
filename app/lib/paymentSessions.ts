'use client';

import { useSyncExternalStore } from 'react';
import { AssetCode } from '../types/dashboard';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * Mirrors the deposit intent lifecycle in FLOW_PLAN.md Flow 3 (fiat) and
 * Flow 6 (crypto).
 */
export type CheckoutStatus =
  | 'awaiting_payment'
  | 'confirming'
  | 'completed'
  | 'underpaid'
  | 'expired';

/** One row of the invoice shown beside the payment panel. */
export interface LineItem {
  description: string;
  /** String minor units of the session's asset. */
  amount: string;
}

export interface PaymentSession {
  /** Deposit intent id (`fdi_...`) — doubles as the /pay/[reference] segment. */
  reference: string;
  correlation_id: string;
  invoice_no: string;

  merchant_name: string;
  order_ref: string;

  customer_id: string;
  customer_name: string;

  /**
   * The asset being collected. An intent is for exactly one rail — a naira
   * intent collects naira, a USDT intent collects USDT. Nothing is converted.
   */
  asset_code: AssetCode;
  /** Billed amount, string minor units of `asset_code`. */
  expected_amount: string;
  items: LineItem[];

  status: CheckoutStatus;

  /** Amount actually received, string minor units of `asset_code`. */
  received_amount?: string;
  /** Block depth reached, for crypto rails. */
  confirmations?: number;

  created_at: string;
  completed_at?: string;

  /**
   * Dynamic NGN virtual account (ADR-021). Absent until the payer asks for it —
   * the account is a real, expiring resource, so the 30-minute clock starts
   * when someone is ready to pay, not when the merchant creates the link.
   */
  account_number?: string;
  bank_name?: string;
  account_name?: string;
  /** Set alongside the account above; there is nothing to expire before that. */
  expires_at?: string;

  /** Deposit address dedicated to this intent (Flow 6), minted on demand. */
  deposit_address?: string;

  /** Where the payer is sent once the payment completes. */
  return_url?: string;
}

/* ------------------------------------------------------------------ */
/* Rail metadata                                                       */
/* ------------------------------------------------------------------ */

export interface RailInfo {
  label: string;
  network: string;
  /** Block depth required before release — Doc 1 §8.3 / FLOW_PLAN.md Flow 6. */
  confirmationsRequired: number;
}

export const RAILS: Record<AssetCode, RailInfo> = {
  NGN: { label: 'Bank transfer', network: 'Lenco MFB', confirmationsRequired: 0 },
  USDT: { label: 'USDT', network: 'TRON (TRC-20)', confirmationsRequired: 19 },
  ETH: { label: 'Ethereum', network: 'ERC-20', confirmationsRequired: 12 },
  BTC: { label: 'Bitcoin', network: 'Bitcoin', confirmationsRequired: 6 },
};

export const CRYPTO_ASSETS: AssetCode[] = ['USDT', 'ETH', 'BTC'];
export const ALL_ASSETS: AssetCode[] = ['NGN', 'USDT', 'ETH', 'BTC'];

export function isCryptoAsset(asset: AssetCode): boolean {
  return asset !== 'NGN';
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

const DECIMALS: Record<AssetCode, number> = { NGN: 2, USDT: 6, ETH: 18, BTC: 8 };

function pow10(n: number): bigint {
  return BigInt(10) ** BigInt(n);
}

/**
 * Parses a human-typed decimal ("0.0031", "50000") into string minor units,
 * digit by digit so we never touch a float — the §2.1 money contract in
 * FRONTEND_DELIVERABLES.md. Extra precision is truncated, not rounded.
 */
export function toMinorUnits(input: string, asset: AssetCode): string {
  const [whole = '', fraction = ''] = input.trim().split('.');
  const decimals = DECIMALS[asset];
  const paddedFraction = (fraction.replace(/\D/g, '') + '0'.repeat(decimals)).slice(0, decimals);
  const digits = (whole.replace(/\D/g, '') || '0') + paddedFraction;

  try {
    return BigInt(digits).toString();
  } catch {
    return '0';
  }
}

/**
 * Renders the full amount, unlike formatMinorUnits which truncates to 2–4
 * decimals for dashboard tables. Telling someone to send "0.0003 BTC" when the
 * amount is 0.0003125 shorts the merchant by 4%.
 */
export function formatQuote(minorUnits: string, asset: AssetCode): string {
  try {
    const raw = BigInt(minorUnits);
    const decimals = DECIMALS[asset];
    const base = pow10(decimals);

    const whole = Number(raw / base).toLocaleString('en-US');
    const fraction = (raw % base).toString().padStart(decimals, '0');

    if (asset === 'NGN') return `${whole}.${fraction.slice(0, 2)}`;

    const trimmed = fraction.replace(/0+$/, '');
    return trimmed ? `${whole}.${trimmed}` : whole;
  } catch {
    return '0';
  }
}

/* ------------------------------------------------------------------ */
/* Rail provisioning                                                   */
/* ------------------------------------------------------------------ */

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const HEX = '0123456789abcdef';

/** 30-minute validity per ADR-021. */
export const INTENT_VALIDITY_MS = 30 * 60 * 1000;

/**
 * Mints a deposit address dedicated to one intent (Flow 6), so inbound funds
 * are attributable without the payer adding a memo. Crypto addresses don't
 * expire, so unlike the virtual account there's no clock.
 */
export function issueDepositAddress(asset: AssetCode): string {
  switch (asset) {
    case 'USDT':
      return `T${randomId(33, BASE58)}`;
    case 'ETH':
      return `0x${randomId(40, HEX)}`;
    case 'BTC':
      return `bc1q${randomId(38, BECH32)}`;
    default:
      return '';
  }
}

/** Issues the dynamic virtual account and starts its 30-minute window. */
export function issueVirtualAccount(session: PaymentSession): Partial<PaymentSession> {
  return {
    account_number: `8091${randomId(6, '0123456789')}`,
    bank_name: 'Lenco MFB',
    account_name: `FLUXEL / ${session.customer_name.toUpperCase()}`,
    expires_at: new Date(Date.now() + INTENT_VALIDITY_MS).toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Store — localStorage backed, synced across tabs                     */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'fluxel_payment_sessions';
const CHANGE_EVENT = 'fluxel:sessions-changed';

type SessionMap = Record<string, PaymentSession>;

const EMPTY: SessionMap = {};

const VALID_STATUSES: string[] = [
  'awaiting_payment',
  'confirming',
  'completed',
  'underpaid',
  'expired',
];

/**
 * Sessions outlive the code that wrote them: localStorage survives every
 * deploy and every schema change, so a record written by an older build can
 * still be sitting there missing fields the current one requires. Validate at
 * this boundary and drop what no longer fits, rather than letting a malformed
 * record reach a consumer and crash it.
 */
function isValidSession(value: unknown): value is PaymentSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<PaymentSession>;

  return (
    typeof session.reference === 'string' &&
    typeof session.expected_amount === 'string' &&
    typeof session.asset_code === 'string' &&
    (ALL_ASSETS as string[]).includes(session.asset_code) &&
    typeof session.status === 'string' &&
    VALID_STATUSES.includes(session.status) &&
    Array.isArray(session.items)
  );
}

function parseSessions(raw: string): SessionMap {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: SessionMap = {};
    for (const [reference, value] of Object.entries(parsed)) {
      if (isValidSession(value)) clean[reference] = value;
    }
    return clean;
  } catch {
    return EMPTY;
  }
}

/**
 * useSyncExternalStore demands a referentially stable snapshot — re-parsing on
 * every call would loop forever, so the parse is memoised against the raw string.
 */
let cachedRaw: string | null = null;
let cachedMap: SessionMap = EMPTY;

function readRaw(): string {
  if (typeof window === 'undefined') return '{}';
  return window.localStorage.getItem(STORAGE_KEY) ?? '{}';
}

function getSnapshot(): SessionMap {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedMap = parseSessions(raw);
  }
  return cachedMap;
}

function getServerSnapshot(): SessionMap {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Fires in *other* tabs — this is what makes the dashboard update live
  // while the payer is on the checkout.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function writeAll(next: SessionMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  // storage events don't fire in the originating tab, so announce locally too.
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export function getSession(reference: string): PaymentSession | undefined {
  return getSnapshot()[reference];
}

export function upsertSession(session: PaymentSession): void {
  writeAll({ ...getSnapshot(), [session.reference]: session });
}

export function patchSession(reference: string, patch: Partial<PaymentSession>): void {
  const current = getSnapshot()[reference];
  if (!current) return;
  writeAll({ ...getSnapshot(), [reference]: { ...current, ...patch } });
}

export function removeSession(reference: string): void {
  const next = { ...getSnapshot() };
  delete next[reference];
  writeAll(next);
}

export function clearSessions(): void {
  writeAll({});
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

function randomId(length: number, alphabet = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export interface CreateSessionInput {
  merchantName: string;
  customerId: string;
  customerName: string;
  /** The single asset this intent collects. */
  asset: AssetCode;
  /** Billed amount in `asset` minor units. */
  expectedAmount: string;
  orderRef?: string;
  /** Pins the reference, so a deep link can be seeded at the URL already open. */
  reference?: string;
  /** Invoice lines. Falls back to a single line for the full amount. */
  items?: LineItem[];
  description?: string;
  /** Where to send the payer after a successful payment. */
  returnUrl?: string;
}

export function createSession(input: CreateSessionInput): PaymentSession {
  const now = Date.now();
  const reference = input.reference ?? `fdi_${randomId(6)}`;
  const orderRef = input.orderRef ?? `ORD-${randomId(5)}`;

  const items: LineItem[] =
    input.items && input.items.length > 0
      ? input.items
      : [
          {
            description: input.description?.trim() || `Order ${orderRef}`,
            amount: input.expectedAmount,
          },
        ];

  return {
    reference,
    correlation_id: `fx_cor_${randomId(14, '0123456789abcdefghijklmnopqrstuvwxyz')}`,
    invoice_no: `INV-${new Date(now).getFullYear()}-${randomId(3, '0123456789')}`,
    merchant_name: input.merchantName,
    order_ref: orderRef,
    customer_id: input.customerId,
    customer_name: input.customerName,
    asset_code: input.asset,
    expected_amount: input.expectedAmount,
    items,
    status: 'awaiting_payment',
    created_at: new Date(now).toISOString(),
    return_url: input.returnUrl,
  };
}

/**
 * Seeds a session so the checkout can be demoed standalone, without first
 * creating a link in the dashboard.
 */
export function createDemoSession(reference?: string): PaymentSession {
  const session = createSession({
    merchantName: 'Acme Fintech Solutions',
    customerId: 'cus_312A9F',
    customerName: 'Amina Bello',
    asset: 'NGN',
    expectedAmount: '5000000',
    reference,
    items: [
      { description: 'Marketplace order settlement', amount: '4500000' },
      { description: 'Platform & processing fee', amount: '500000' },
    ],
  });
  upsertSession(session);
  return session;
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useSessions(): SessionMap {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function usePaymentSession(reference: string): PaymentSession | undefined {
  return useSessions()[reference];
}
