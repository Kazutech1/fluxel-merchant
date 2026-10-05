import { DAY_MS } from './format';
import type {
  ApiKeySet,
  ApiMode,
  BusinessProfile,
  CheckoutSettings,
  Customer,
  Invoice,
  NotificationKey,
  PaymentLink,
  Plan,
  PlanInterval,
  SecuritySettings,
  Subscription,
  Verification,
  WebhookEndpoint,
} from './types';

/**
 * The fixed parts of the demo merchant: what they sell, how they bill, how the
 * account is configured. `demoData.ts` replays these into the ledger.
 */

type Rng = () => number;

export const WEBHOOK_EVENTS = [
  'payment.successful',
  'payment.failed',
  'withdrawal.completed',
  'withdrawal.failed',
  'refund.processed',
  'dispute.opened',
  'dispute.resolved',
  'invoice.paid',
  'subscription.created',
  'subscription.renewed',
  'subscription.cancelled',
] as const;

export function token(rng: Rng, length: number, alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'): string {
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(rng() * alphabet.length)];
  return out;
}

export function buildLinks(now: number): PaymentLink[] {
  const ago = (days: number) => now - days * DAY_MS;
  return [
    { id: 'lnk_store', title: 'Store order', description: 'Pay for any order — enter the amount on your receipt.', amount: null, currency: 'NGN', slug: 'kaz-store-order', active: true, createdAt: ago(140) },
    { id: 'lnk_ankara', title: 'Ankara fabric bundle', description: '6 yards, assorted prints. Delivery in Lagos within 48 hours.', amount: 45_000, currency: 'NGN', slug: 'ankara-bundle', active: true, createdAt: ago(75) },
    { id: 'lnk_wholesale', title: 'Wholesale deposit', description: 'Reserve stock for resellers. Balance due on pickup.', amount: 250_000, currency: 'NGN', slug: 'wholesale-deposit', active: true, createdAt: ago(120) },
    { id: 'lnk_delivery', title: 'Delivery fee', description: 'Same-day delivery within Lagos.', amount: 3_500, currency: 'NGN', slug: 'delivery-fee', active: true, createdAt: ago(100) },
    { id: 'lnk_intl', title: 'International orders', description: 'For customers outside Nigeria paying in USDT.', amount: null, currency: 'USDT', slug: 'intl-usdt', active: true, createdAt: ago(60) },
    { id: 'lnk_bf', title: 'Black Friday pre-order', description: 'Closed — thanks for the support!', amount: 30_000, currency: 'NGN', slug: 'black-friday-2025', active: false, createdAt: ago(320) },
  ];
}

export function buildPlans(now: number): Plan[] {
  return [
    { id: 'pln_box_m', name: 'Kaz Box · Monthly', description: 'A curated fabric box every month.', amount: 15_000, currency: 'NGN', interval: 'monthly', active: true, createdAt: now - 200 * DAY_MS },
    { id: 'pln_box_w', name: 'Kaz Box · Weekly', description: 'Smaller box, every week.', amount: 4_500, currency: 'NGN', interval: 'weekly', active: true, createdAt: now - 180 * DAY_MS },
    { id: 'pln_reseller', name: 'Reseller Pro', description: 'Wholesale pricing and priority stock for resellers abroad.', amount: 25, currency: 'USDT', interval: 'monthly', active: true, createdAt: now - 150 * DAY_MS },
    { id: 'pln_club', name: 'Wholesale Club', description: 'Annual membership with 10% off bulk orders.', amount: 120_000, currency: 'NGN', interval: 'yearly', active: true, createdAt: now - 400 * DAY_MS },
  ];
}

export function addInterval(t: number, interval: PlanInterval, k: number): number {
  const d = new Date(t);
  if (interval === 'weekly') d.setDate(d.getDate() + 7 * k);
  else if (interval === 'monthly') d.setMonth(d.getMonth() + k);
  else d.setFullYear(d.getFullYear() + k);
  return d.getTime();
}

/** Subscriptions with their billing replayed later; `endedAt` stops billing (pause or cancel). */
export interface SubscriptionSeed extends Subscription {
  endedAt?: number;
}

export function buildSubscriptions(customers: Customer[], now: number): SubscriptionSeed[] {
  const at = (daysAgo: number, hour = 9) => {
    const d = new Date(now - daysAgo * DAY_MS);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  };
  const seeds: [number, string, number, Subscription['status'], number?][] = [
    // [customer index, plan, started days ago, status, ended days ago]
    [0, 'pln_box_m', 160, 'active'],
    [1, 'pln_box_m', 95, 'active'],
    [3, 'pln_box_w', 70, 'active'],
    [5, 'pln_box_m', 40, 'active'],
    [2, 'pln_reseller', 120, 'active'],
    [8, 'pln_reseller', 55, 'past_due'],
    [9, 'pln_box_w', 50, 'paused', 9],
    [11, 'pln_box_m', 85, 'cancelled', 21],
    [4, 'pln_club', 30, 'active'],
    [12, 'pln_reseller', 18, 'active'],
  ];
  return seeds.map(([ci, planId, started, status, ended], i) => ({
    id: `sub_${String(i + 1).padStart(4, '0')}`,
    planId,
    customerId: customers[ci].id,
    status,
    startedAt: at(started, 9 + (i % 5)),
    nextBillingAt: null,
    endedAt: ended !== undefined ? at(ended) : undefined,
    cancelledAt: status === 'cancelled' && ended !== undefined ? at(ended) : undefined,
  }));
}

const INVOICE_ITEMS: [string, number][] = [
  ['Ankara fabric (6 yards)', 18_000],
  ['Aso-oke set, custom colour', 65_000],
  ['Adire tie-dye, bulk (per bale)', 120_000],
  ['Tailoring — agbada', 45_000],
  ['Lace fabric (5 yards)', 38_000],
  ['Delivery and handling', 7_500],
  ['Embroidery add-on', 12_000],
];

export function buildInvoices(rng: Rng, customers: Customer[], now: number): Invoice[] {
  // [customer index, issued days ago, due after days, status, paid days after issue]
  const seeds: [number, number, number, Invoice['status'], number?][] = [
    [6, 70, 14, 'paid', 3],
    [0, 58, 14, 'paid', 6],
    [10, 45, 7, 'paid', 2],
    [3, 33, 14, 'paid', 9],
    [13, 26, 7, 'paid', 4],
    [1, 15, 14, 'paid', 1],
    [7, 20, 7, 'sent'], // overdue
    [14, 6, 14, 'sent'],
    [5, 2, 30, 'sent'],
    [15, 1, 14, 'draft'],
    [16, 40, 14, 'void'],
  ];
  return seeds.map(([ci, issuedAgo, dueAfter, status, paidAfter], i) => {
    const issuedAt = now - issuedAgo * DAY_MS - Math.floor(rng() * 6) * 3_600_000;
    const count = 1 + Math.floor(rng() * 3);
    const items = Array.from({ length: count }, () => {
      const [description, unitPrice] = INVOICE_ITEMS[Math.floor(rng() * INVOICE_ITEMS.length)];
      return { description, unitPrice, quantity: 1 + Math.floor(rng() * 4) };
    });
    return {
      id: `inv_${String(i + 31).padStart(4, '0')}`,
      number: `INV-${String(i + 31).padStart(4, '0')}`,
      customerId: customers[ci].id,
      currency: 'NGN',
      items,
      status,
      issuedAt,
      dueAt: issuedAt + dueAfter * DAY_MS,
      paidAt: paidAfter !== undefined ? issuedAt + paidAfter * DAY_MS + 4 * 3_600_000 : undefined,
      note: 'Thank you for shopping with us.',
    };
  });
}

export const invoiceTotal = (inv: Pick<Invoice, 'items'>) =>
  inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

export function buildApiKeys(rng: Rng, now: number): Record<ApiMode, ApiKeySet> {
  return {
    test: {
      mode: 'test',
      publicKey: `pk_test_${token(rng, 32)}`,
      secretKey: `sk_test_${token(rng, 40)}`,
      createdAt: now - 160 * DAY_MS,
      lastUsedAt: now - 40 * 60_000,
    },
    live: {
      mode: 'live',
      publicKey: `pk_live_${token(rng, 32)}`,
      secretKey: `sk_live_${token(rng, 40)}`,
      createdAt: now - 120 * DAY_MS,
      lastUsedAt: now - 3 * 60_000,
    },
  };
}

export function buildWebhooks(rng: Rng, domain: string, now: number): WebhookEndpoint[] {
  return [
    {
      id: 'whk_main',
      url: `https://api.${domain}/webhooks/fluxel`,
      events: ['payment.successful', 'payment.failed', 'withdrawal.completed', 'refund.processed', 'dispute.opened', 'invoice.paid'],
      secret: `whsec_${token(rng, 32)}`,
      enabled: true,
      createdAt: now - 118 * DAY_MS,
    },
    {
      id: 'whk_erp',
      url: `https://erp.${domain}/hooks/payments`,
      events: ['payment.successful', 'subscription.renewed'],
      secret: `whsec_${token(rng, 32)}`,
      enabled: true,
      createdAt: now - 45 * DAY_MS,
    },
  ];
}

export function webhookPayload(event: string, data: Record<string, unknown>, at: number): string {
  return JSON.stringify({ event, created_at: new Date(at).toISOString(), data }, null, 2);
}

export function buildBusiness(businessName: string, domain: string): BusinessProfile {
  return {
    tradingName: businessName.replace(/\s+(Ltd|Limited|Plc)\.?$/i, ''),
    legalName: businessName,
    email: `hello@${domain}`,
    supportEmail: `support@${domain}`,
    phone: '+234 803 555 0142',
    website: `https://${domain}`,
    address: '14 Admiralty Way, Lekki Phase 1, Lagos',
    industry: 'Retail & e-commerce',
    rcNumber: 'RC 1849302',
  };
}

export function buildCheckout(businessName: string): CheckoutSettings {
  return {
    displayName: businessName.replace(/\s+(Ltd|Limited|Plc)\.?$/i, ''),
    brandColor: '#0f0f10',
    methods: { bank_transfer: true, usdt_tron: true, usdt_bsc: true, usdt_eth: false },
    feeBearer: 'merchant',
    expiryMinutes: 30,
    redirectUrl: '',
    sendReceipts: true,
  };
}

export const DEFAULT_NOTIFICATIONS: Record<NotificationKey, boolean> = {
  payment_received: false,
  withdrawal_completed: true,
  refund_processed: true,
  dispute_opened: true,
  invoice_paid: true,
  subscription_failed: true,
  team_changes: true,
  weekly_summary: true,
};

export function buildSecurity(now: number): SecuritySettings {
  return {
    twoFactor: true,
    loginAlerts: true,
    approvalThreshold: 5_000_000,
    sessions: [
      { id: 'ses_1', device: 'Chrome on Windows', location: 'Lagos, NG', ip: '102.89.34.17', lastActiveAt: now, current: true },
      { id: 'ses_2', device: 'Safari on iPhone', location: 'Lagos, NG', ip: '102.89.40.221', lastActiveAt: now - 5 * 3_600_000 },
      { id: 'ses_3', device: 'Chrome on macOS', location: 'Abuja, NG', ip: '105.112.18.9', lastActiveAt: now - 4 * DAY_MS },
    ],
  };
}

export function buildVerification(now: number): Verification {
  return {
    status: 'verified',
    tier: 2,
    limits: { perTransaction: 10_000_000, daily: 50_000_000 },
    documents: [
      { id: 'doc_cac', name: 'Certificate of incorporation', description: 'CAC registration certificate', status: 'approved', uploadedAt: now - 130 * DAY_MS },
      { id: 'doc_memart', name: 'Memorandum & articles', description: 'MEMART or CAC status report', status: 'approved', uploadedAt: now - 130 * DAY_MS },
      { id: 'doc_id', name: "Director's ID", description: 'NIN slip, passport or driver’s licence', status: 'approved', uploadedAt: now - 129 * DAY_MS },
      { id: 'doc_address', name: 'Proof of address', description: 'Utility bill from the last 3 months', status: 'approved', uploadedAt: now - 128 * DAY_MS },
      { id: 'doc_tin', name: 'Tax identification (TIN)', description: 'FIRS TIN certificate', status: 'approved', uploadedAt: now - 126 * DAY_MS },
      { id: 'doc_aml', name: 'AML policy', description: 'Needed to raise your limits to tier 3', status: 'missing' },
    ],
  };
}
