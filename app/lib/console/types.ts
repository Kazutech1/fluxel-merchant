/**
 * Shapes for the merchant console's simulated data.
 *
 * Everything the console renders is dummy data generated in the browser (see
 * `demoData.ts`). Amounts are plain numbers in major units — ₦1,250.50 is
 * `1250.5` — because nothing here settles real money.
 */

export type Currency = 'NGN' | 'USDT';

export type TxnKind = 'payment' | 'withdrawal';

export type TxnStatus = 'successful' | 'pending' | 'processing' | 'failed';

/** What started a withdrawal — a person, a balance threshold, or the clock. */
export type PayoutTrigger = 'manual' | 'automatic' | 'scheduled';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: number;
}

export interface Transaction {
  id: string;
  reference: string;
  kind: TxnKind;
  currency: Currency;
  /** Gross amount, always positive; `kind` gives the direction. */
  amount: number;
  fee: number;
  status: TxnStatus;
  createdAt: number;
  /** "Bank transfer", "USDT · TRON", … */
  method: string;
  narration: string;
  customerId?: string;
  destinationId?: string;
  trigger?: PayoutTrigger;
  /** Set when a withdrawal pays out in the other currency. */
  converted?: { currency: Currency; amount: number; rate: number };
  /** Where a payment came from, when it wasn't a plain checkout/API charge. */
  linkId?: string;
  invoiceId?: string;
  subscriptionId?: string;
  /** Total refunded so far, if any. */
  refunded?: number;
  disputeId?: string;
}

export type CryptoNetwork = 'TRON' | 'BSC' | 'Ethereum';

export type Destination =
  | {
      id: string;
      type: 'bank';
      currency: 'NGN';
      label: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }
  | {
      id: string;
      type: 'crypto';
      currency: 'USDT';
      label: string;
      network: CryptoNetwork;
      address: string;
    };

export type PayoutMode = 'manual' | 'automatic' | 'scheduled';

export type PayoutFrequency = 'daily' | 'weekly' | 'monthly';

export interface PayoutRule {
  currency: Currency;
  mode: PayoutMode;
  destinationId: string;
  /** Automatic: pay out once the balance reaches this. */
  threshold: number;
  /** Left behind after every automatic or scheduled payout. */
  reserve: number;
  frequency: PayoutFrequency;
  /** 0 = Sunday. Weekly only. */
  weekday: number;
  /** 1–28. Monthly only. */
  monthDay: number;
  /** "HH:MM", 24-hour, Lagos time. */
  time: string;
}

export type Role = 'owner' | 'admin' | 'finance' | 'viewer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'invited';
  lastActiveAt: number | null;
  isYou?: boolean;
}

export interface BalancePoint {
  /** Start of the day, ms. */
  t: number;
  NGN: number;
  USDT: number;
}

/* ------------------------------------------------------------------ */
/* Collecting money                                                    */
/* ------------------------------------------------------------------ */

export interface PaymentLink {
  id: string;
  title: string;
  description: string;
  /** null = the customer enters the amount. */
  amount: number | null;
  currency: Currency;
  slug: string;
  active: boolean;
  createdAt: number;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

/** `overdue` is never stored — it's a sent invoice past its due date. */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  currency: Currency;
  items: InvoiceItem[];
  status: InvoiceStatus;
  issuedAt: number;
  dueAt: number;
  paidAt?: number;
  txnId?: string;
  note?: string;
}

export type PlanInterval = 'weekly' | 'monthly' | 'yearly';

export interface Plan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: Currency;
  interval: PlanInterval;
  active: boolean;
  createdAt: number;
}

export type SubscriptionStatus = 'active' | 'past_due' | 'paused' | 'cancelled';

export interface Subscription {
  id: string;
  planId: string;
  customerId: string;
  status: SubscriptionStatus;
  startedAt: number;
  nextBillingAt: number | null;
  cancelledAt?: number;
}

/* ------------------------------------------------------------------ */
/* Money going back                                                    */
/* ------------------------------------------------------------------ */

export type RefundStatus = 'processing' | 'successful' | 'failed';

export interface Refund {
  id: string;
  reference: string;
  txnId: string;
  amount: number;
  currency: Currency;
  reason: string;
  status: RefundStatus;
  createdAt: number;
  initiatedBy: string;
}

export type DisputeStatus = 'needs_response' | 'under_review' | 'won' | 'lost' | 'accepted';

export interface Dispute {
  id: string;
  txnId: string;
  amount: number;
  currency: Currency;
  reason: string;
  status: DisputeStatus;
  openedAt: number;
  dueBy: number;
  evidence?: string;
  resolvedAt?: number;
}

/* ------------------------------------------------------------------ */
/* Developers                                                          */
/* ------------------------------------------------------------------ */

export type ApiMode = 'test' | 'live';

export interface ApiKeySet {
  mode: ApiMode;
  publicKey: string;
  secretKey: string;
  createdAt: number;
  lastUsedAt: number | null;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  createdAt: number;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  /** HTTP status the endpoint answered with; 0 = timed out. */
  status: number;
  attempt: number;
  at: number;
  durationMs: number;
  payload: string;
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export interface BusinessProfile {
  tradingName: string;
  legalName: string;
  email: string;
  supportEmail: string;
  phone: string;
  website: string;
  address: string;
  industry: string;
  rcNumber: string;
}

export type CheckoutMethod = 'bank_transfer' | 'usdt_tron' | 'usdt_bsc' | 'usdt_eth';

export interface CheckoutSettings {
  displayName: string;
  brandColor: string;
  methods: Record<CheckoutMethod, boolean>;
  /** Who absorbs Fluxel's fee on a payment. */
  feeBearer: 'merchant' | 'customer';
  expiryMinutes: number;
  redirectUrl: string;
  sendReceipts: boolean;
}

export type NotificationKey =
  | 'payment_received'
  | 'withdrawal_completed'
  | 'refund_processed'
  | 'dispute_opened'
  | 'invoice_paid'
  | 'subscription_failed'
  | 'team_changes'
  | 'weekly_summary';

export interface DeviceSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActiveAt: number;
  current?: boolean;
}

export interface SecuritySettings {
  twoFactor: boolean;
  loginAlerts: boolean;
  /** Require a second teammate to approve withdrawals above this, in NGN. 0 = off. */
  approvalThreshold: number;
  sessions: DeviceSession[];
}

export type DocumentStatus = 'approved' | 'in_review' | 'missing';

export interface VerificationDocument {
  id: string;
  name: string;
  description: string;
  status: DocumentStatus;
  uploadedAt?: number;
}

export interface Verification {
  status: 'verified' | 'in_review' | 'action_required';
  tier: number;
  documents: VerificationDocument[];
  limits: { perTransaction: number; daily: number };
}

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  at: number;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  at: number;
  read: boolean;
  /** Hash route to open, e.g. "disputes". */
  href?: string;
}

export interface ConsoleData {
  balances: Record<Currency, number>;
  customers: Customer[];
  /** Newest first. */
  transactions: Transaction[];
  destinations: Destination[];
  rules: Record<Currency, PayoutRule>;
  team: TeamMember[];
  /** One point per day, oldest first; the last point is today and tracks live. */
  history: BalancePoint[];

  links: PaymentLink[];
  invoices: Invoice[];
  plans: Plan[];
  subscriptions: Subscription[];
  refunds: Refund[];
  disputes: Dispute[];

  apiKeys: Record<ApiMode, ApiKeySet>;
  webhooks: WebhookEndpoint[];
  /** Newest first. */
  deliveries: WebhookDelivery[];

  business: BusinessProfile;
  checkout: CheckoutSettings;
  notifications: Record<NotificationKey, boolean>;
  security: SecuritySettings;
  verification: Verification;
  /** Newest first. */
  activity: ActivityEntry[];
  /** Newest first. */
  notices: Notice[];
}
