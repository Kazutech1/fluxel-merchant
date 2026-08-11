'use client';

import { useSyncExternalStore } from 'react';
import { AssetCode } from '../types/dashboard';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CheckoutMethod = 'ngn_transfer' | 'usdt_tron' | 'eth' | 'btc';

/**
 * Mirrors the deposit intent lifecycle in FLOW_PLAN.md Flow 3 (fiat) and
 * Flow 6 (crypto), with `awaiting_method` added for the payer-facing step
 * that has no server-side equivalent.
 */
export type CheckoutStatus =
  | 'awaiting_method'
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

  /** Asset the merchant billed in. Always NGN today. */
  asset_code: AssetCode;
  /** Billed amount, string minor units (kobo). */
  expected_amount: string;
  items: LineItem[];

  status: CheckoutStatus;
  method?: CheckoutMethod;

  /** Asset actually paid in — differs from asset_code when paying by crypto. */
  paid_asset?: AssetCode;
  /** Amount actually received, string minor units of `paid_asset`. */
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
  branch?: string;
  /** Set alongside the account above; there is nothing to expire before that. */
  expires_at?: string;
}

/* ------------------------------------------------------------------ */
/* Rail metadata                                                       */
/* ------------------------------------------------------------------ */

export interface RailInfo {
  method: CheckoutMethod;
  asset: AssetCode;
  label: string;
  network: string;
  hint: string;
  /** Block depth required before release — Doc 1 §8.3 / FLOW_PLAN.md Flow 6. */
  confirmationsRequired: number;
}

export const RAILS: Record<CheckoutMethod, RailInfo> = {
  ngn_transfer: {
    method: 'ngn_transfer',
    asset: 'NGN',
    label: 'Bank transfer',
    network: 'Lenco MFB',
    hint: 'Transfer from any Nigerian bank app',
    confirmationsRequired: 0,
  },
  usdt_tron: {
    method: 'usdt_tron',
    asset: 'USDT',
    label: 'USDT',
    network: 'TRON (TRC-20)',
    hint: 'Lowest network fee',
    confirmationsRequired: 19,
  },
  eth: {
    method: 'eth',
    asset: 'ETH',
    label: 'Ethereum',
    network: 'ERC-20',
    hint: '12 block confirmations',
    confirmationsRequired: 12,
  },
  btc: {
    method: 'btc',
    asset: 'BTC',
    label: 'Bitcoin',
    network: 'Bitcoin',
    hint: 'Slowest to confirm',
    confirmationsRequired: 6,
  },
};

export const RAIL_ORDER: CheckoutMethod[] = ['ngn_transfer', 'usdt_tron', 'eth', 'btc'];

export type CryptoMethod = Exclude<CheckoutMethod, 'ngn_transfer'>;

/** Grouped behind a single "Crypto" tab, with an asset picker inside. */
export const CRYPTO_METHODS: CryptoMethod[] = ['usdt_tron', 'eth', 'btc'];

export function isCryptoMethod(method: CheckoutMethod): method is CryptoMethod {
  return method !== 'ngn_transfer';
}

/** Demo FX: whole naira per 1 major unit of each asset. */
const NGN_PER_UNIT: Record<AssetCode, number> = {
  NGN: 1,
  USDT: 1_650,
  ETH: 5_600_000,
  BTC: 160_000_000,
};

const DECIMALS: Record<AssetCode, number> = { NGN: 2, USDT: 6, ETH: 18, BTC: 8 };

/**
 * How many decimals a payer is actually asked to send. Quotes are truncated to
 * this precision so the amount we display, the amount the copy button yields,
 * and the amount we expect are byte-identical — a payer who sends exactly what
 * the screen says must never land in `underpaid`.
 */
const QUOTE_DECIMALS: Record<AssetCode, number> = { NGN: 2, USDT: 6, ETH: 6, BTC: 8 };

function pow10(n: number): bigint {
  return BigInt(10) ** BigInt(n);
}

/** Zeroes out any precision below what we quote. */
function quantize(minorUnits: string, asset: AssetCode): string {
  const excess = DECIMALS[asset] - QUOTE_DECIMALS[asset];
  if (excess <= 0) return minorUnits;
  const factor = pow10(excess);
  return ((BigInt(minorUnits) / factor) * factor).toString();
}

/**
 * Converts a kobo amount into the minor units of `asset`, in BigInt throughout
 * so we never touch a float — the §2.1 money contract in FRONTEND_DELIVERABLES.md.
 */
export function convertFromNgn(koboAmount: string, asset: AssetCode): string {
  if (asset === 'NGN') return koboAmount;
  try {
    const kobo = BigInt(koboAmount);
    const scaled = kobo * pow10(DECIMALS[asset]);
    const divisor = BigInt(100) * BigInt(NGN_PER_UNIT[asset]);
    return quantize((scaled / divisor).toString(), asset);
  } catch {
    return '0';
  }
}

/**
 * Renders the full quoted amount, unlike formatMinorUnits which truncates to
 * 2–4 decimals for dashboard tables. Telling someone to send "0.0003 BTC" when
 * the quote is 0.0003125 shorts the merchant by 4%.
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

/** Deposit addresses shown per crypto rail. Static demo wallets. */
export const DEPOSIT_ADDRESSES: Record<Exclude<CheckoutMethod, 'ngn_transfer'>, string> = {
  usdt_tron: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  eth: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
  btc: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
};

/* ------------------------------------------------------------------ */
/* Store — localStorage backed, synced across tabs                     */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'fluxel_payment_sessions';
const CHANGE_EVENT = 'fluxel:sessions-changed';

type SessionMap = Record<string, PaymentSession>;

const EMPTY: SessionMap = {};

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
    try {
      cachedMap = JSON.parse(raw) as SessionMap;
    } catch {
      cachedMap = EMPTY;
    }
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
  /** Billed amount in kobo, string minor units. */
  expectedAmount: string;
  orderRef?: string;
  /** Pins the reference, so a deep link can be seeded at the URL already open. */
  reference?: string;
  /** Invoice lines. Falls back to a single line for the full amount. */
  items?: LineItem[];
  description?: string;
}

/** 30-minute validity per ADR-021. */
export const INTENT_VALIDITY_MS = 30 * 60 * 1000;

const BRANCHES = ['Victoria Island, Lagos', 'Ikeja GRA, Lagos', 'Wuse II, Abuja'];

export function createSession(input: CreateSessionInput): PaymentSession {
  const now = Date.now();
  const reference = input.reference ?? `fdi_${randomId(6)}`;
  const orderRef = input.orderRef ?? `ORD-${randomId(5)}`;

  const items: LineItem[] =
    input.items && input.items.length > 0
      ? input.items
      : [{ description: input.description?.trim() || `Order ${orderRef}`, amount: input.expectedAmount }];

  return {
    reference,
    correlation_id: `fx_cor_${randomId(14, '0123456789abcdefghijklmnopqrstuvwxyz')}`,
    invoice_no: `INV-${new Date(now).getFullYear()}-${randomId(3, '0123456789')}`,
    merchant_name: input.merchantName,
    order_ref: orderRef,
    customer_id: input.customerId,
    customer_name: input.customerName,
    asset_code: 'NGN',
    expected_amount: input.expectedAmount,
    items,
    // Bank transfer is the default rail, so the payer lands on instructions
    // rather than on an extra chooser step.
    method: 'ngn_transfer',
    status: 'awaiting_payment',
    created_at: new Date(now).toISOString(),
  };
}

/**
 * Issues the dynamic virtual account and starts its 30-minute validity window.
 * Called when the payer asks for account details, never on link creation.
 */
export function issueVirtualAccount(session: PaymentSession): Partial<PaymentSession> {
  return {
    account_number: `8091${randomId(6, '0123456789')}`,
    bank_name: 'Lenco MFB',
    account_name: `FLUXEL / ${session.customer_name.toUpperCase()}`,
    branch: BRANCHES[Math.floor(Math.random() * BRANCHES.length)],
    expires_at: new Date(Date.now() + INTENT_VALIDITY_MS).toISOString(),
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

/** Sessions that reached a terminal money-moved state, newest first. */
export function useSettledSessions(): PaymentSession[] {
  const map = useSessions();
  return Object.values(map)
    .filter((s) => s.status === 'completed' || s.status === 'underpaid')
    .sort((a, b) => (b.completed_at ?? b.created_at).localeCompare(a.completed_at ?? a.created_at));
}
