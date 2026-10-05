import { DAY_MS, WITHDRAWAL_FEE, startOfDay } from './format';
import {
  DEFAULT_NOTIFICATIONS,
  addInterval,
  buildApiKeys,
  buildBusiness,
  buildCheckout,
  buildInvoices,
  buildLinks,
  buildPlans,
  buildSecurity,
  buildSubscriptions,
  buildVerification,
  buildWebhooks,
  invoiceTotal,
  webhookPayload,
} from './demoCatalog';
import { formatMoney } from './format';
import type {
  ActivityEntry,
  BalancePoint,
  ConsoleData,
  Currency,
  Customer,
  Destination,
  Dispute,
  Notice,
  PayoutRule,
  Refund,
  TeamMember,
  Transaction,
  WebhookDelivery,
} from './types';

/**
 * Builds 90 days of believable merchant activity.
 *
 * The ledger is replayed day by day — payments in, withdrawals out — so the
 * balance graph, the balance cards and the transaction list always agree with
 * each other. Seeded, so every visit tells the same story; only the dates move
 * with "today".
 */

const HISTORY_DAYS = 90;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

const round2 = (n: number) => Math.round(n * 100) / 100;

function code(rng: Rng, length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(rng() * chars.length)];
  return out;
}

/** [name, weight, prefers crypto] — weight skews who buys most. */
const CUSTOMER_SEED: [string, number, boolean][] = [
  ['Amina Bello', 9, false],
  ['Chukwuemeka Obi', 7, false],
  ['Tolu Adeyemi', 6, true],
  ['Ngozi Okonkwo', 6, false],
  ['Ibrahim Musa', 5, false],
  ['Funke Akindele', 5, false],
  ['Segun Ajayi', 4, true],
  ['Blessing Eze', 4, false],
  ['Kelechi Nwankwo', 3, true],
  ['Zainab Abubakar', 3, false],
  ['Damilola Ogun', 3, false],
  ['Yusuf Lawal', 2, false],
  ['Adaeze Uche', 2, true],
  ['Oluwaseun Bankole', 2, false],
  ['Hauwa Garba', 2, false],
  ['Victor Ekpo', 1, true],
  ['Grace Olatunji', 1, false],
  ['Emmanuel Danjuma', 1, false],
];

function buildCustomers(rng: Rng, start: number): Customer[] {
  return CUSTOMER_SEED.map(([name], i) => {
    const [first, last] = name.toLowerCase().split(' ');
    return {
      id: `cus_${code(rng, 10).toLowerCase()}`,
      name,
      email: `${first}.${last}@${i % 3 === 0 ? 'gmail.com' : i % 3 === 1 ? 'yahoo.com' : 'outlook.com'}`,
      phone: `+234 80${Math.floor(rng() * 10)} ${String(Math.floor(rng() * 900) + 100)} ${String(Math.floor(rng() * 9000) + 1000)}`,
      joinedAt: start - Math.floor(rng() * 200) * DAY_MS,
    };
  });
}

function buildDestinations(businessName: string): Destination[] {
  const accountName = businessName.toUpperCase();
  return [
    {
      id: 'dst_gtb',
      type: 'bank',
      currency: 'NGN',
      label: 'Main account',
      bankName: 'GTBank',
      accountNumber: '0123454821',
      accountName,
    },
    {
      id: 'dst_access',
      type: 'bank',
      currency: 'NGN',
      label: 'Operations',
      bankName: 'Access Bank',
      accountNumber: '0698217310',
      accountName,
    },
    {
      id: 'dst_tron',
      type: 'crypto',
      currency: 'USDT',
      label: 'Treasury wallet',
      network: 'TRON',
      address: 'TQ8xA2mVb7Rk1pL4cN9sD3fG6hJ5wY2k2Fd',
    },
  ];
}

export function defaultRules(): Record<Currency, PayoutRule> {
  return {
    NGN: {
      currency: 'NGN',
      mode: 'manual',
      destinationId: 'dst_gtb',
      threshold: 1_000_000,
      reserve: 50_000,
      frequency: 'daily',
      weekday: 5,
      monthDay: 1,
      time: '17:00',
    },
    USDT: {
      currency: 'USDT',
      mode: 'scheduled',
      destinationId: 'dst_tron',
      threshold: 2_000,
      reserve: 50,
      frequency: 'weekly',
      weekday: 5,
      monthDay: 1,
      time: '17:00',
    },
  };
}

function buildTeam(ownerEmail: string, now: number): TeamMember[] {
  const domain = ownerEmail.split('@')[1] || 'kazstores.ng';
  const local = ownerEmail.split('@')[0] || 'you';
  const ownerName = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');

  return [
    { id: 'usr_you', name: ownerName || 'You', email: ownerEmail, role: 'owner', status: 'active', lastActiveAt: now, isYou: true },
    { id: 'usr_chi', name: 'Chidinma Eze', email: `chidinma@${domain}`, role: 'admin', status: 'active', lastActiveAt: now - 2 * 3_600_000 },
    { id: 'usr_tun', name: 'Tunde Bakare', email: `tunde@${domain}`, role: 'finance', status: 'active', lastActiveAt: now - 26 * 3_600_000 },
    { id: 'usr_hal', name: 'Halima Yusuf', email: `halima@${domain}`, role: 'viewer', status: 'active', lastActiveAt: now - 3 * DAY_MS },
    { id: 'usr_eme', name: 'Emeka Nwosu', email: `emeka@${domain}`, role: 'finance', status: 'invited', lastActiveAt: null },
  ];
}

export function paymentFee(amount: number, currency: Currency): number {
  return currency === 'NGN' ? round2(Math.min(amount * 0.01, 2000)) : round2(Math.max(amount * 0.01, 0.5));
}

export function paymentMethod(currency: Currency): string {
  return currency === 'NGN' ? 'Bank transfer' : 'USDT · TRON';
}

/** A random payment amount in the shape this merchant's sales take. */
export function randomPaymentAmount(rng: Rng, currency: Currency): number {
  const skew = rng() ** 2.2;
  return currency === 'NGN'
    ? Math.round((4_500 + skew * 420_000) / 100) * 100
    : round2(12 + skew * 950);
}

const NARRATIONS = [
  'Order payment',
  'Invoice settlement',
  'Bulk order',
  'Online checkout',
  'Wholesale purchase',
  'Subscription renewal',
];

/** A payment the catalog dictates — a subscription renewal or a paid invoice. */
interface SpecialPayment {
  t: number;
  currency: Currency;
  amount: number;
  customerId: string;
  narration: string;
  status: Transaction['status'];
  subscriptionId?: string;
  invoiceId?: string;
}

type DayEvent =
  | { kind: 'payment'; t: number; customer: number; currency: Currency }
  | { kind: 'special'; t: number; p: SpecialPayment }
  | { kind: 'withdrawal'; t: number; currency: Currency };

const DISPUTE_REASONS = [
  'Customer says the item never arrived',
  'Customer doesn’t recognise this payment',
  'Duplicate payment',
  'Item not as described',
];

export const REFUND_REASONS = [
  'Out of stock',
  'Customer changed their mind',
  'Duplicate payment',
  'Damaged in delivery',
  'Order cancelled',
];

export const LIVE_SEED = 20261005;
export const SANDBOX_SEED = 77;

export function buildDemoData(businessName: string, ownerEmail: string, seed = LIVE_SEED): ConsoleData {
  const rng = mulberry32(seed);
  const now = Date.now();
  const today = startOfDay(now);
  const start = today - (HISTORY_DAYS - 1) * DAY_MS;
  const domain = ownerEmail.split('@')[1] || 'kazstores.ng';

  const customers = buildCustomers(rng, start);
  const destinations = buildDestinations(businessName);
  const rules = defaultRules();
  const team = buildTeam(ownerEmail, now);

  const links = buildLinks(now);
  const plans = buildPlans(now);
  const subSeeds = buildSubscriptions(customers, now);
  const invoices = buildInvoices(rng, customers, now);

  // ---- Catalog-driven payments, bucketed by day --------------------------
  const special = new Map<number, SpecialPayment[]>();
  const addSpecial = (p: SpecialPayment) => {
    if (p.t < start || p.t > now) return;
    const day = Math.floor((startOfDay(p.t) - start) / DAY_MS);
    special.set(day, [...(special.get(day) ?? []), p]);
  };

  const subscriptions = subSeeds.map(({ endedAt, ...sub }) => {
    const plan = plans.find((p) => p.id === sub.planId)!;
    const stop = endedAt ?? Infinity;
    let k = 0;
    let t = sub.startedAt;
    const charges: number[] = [];
    while (t <= now && t <= stop) {
      charges.push(t);
      t = addInterval(sub.startedAt, plan.interval, ++k);
    }
    charges.forEach((ct, idx) =>
      addSpecial({
        t: ct,
        currency: plan.currency,
        amount: plan.amount,
        customerId: sub.customerId,
        narration: `Subscription · ${plan.name}`,
        status: sub.status === 'past_due' && idx === charges.length - 1 ? 'failed' : 'successful',
        subscriptionId: sub.id,
      })
    );
    const live = sub.status === 'active' || sub.status === 'past_due';
    return { ...sub, nextBillingAt: live ? (sub.status === 'past_due' ? now + DAY_MS : t) : null };
  });

  for (const inv of invoices) {
    if (inv.status !== 'paid' || !inv.paidAt) continue;
    addSpecial({
      t: inv.paidAt,
      currency: inv.currency,
      amount: invoiceTotal(inv),
      customerId: inv.customerId,
      narration: `Invoice ${inv.number}`,
      status: 'successful',
      invoiceId: inv.id,
    });
  }

  const totalWeight = CUSTOMER_SEED.reduce((s, [, w]) => s + w, 0);
  const pickCustomer = () => {
    let r = rng() * totalWeight;
    for (let i = 0; i < CUSTOMER_SEED.length; i++) {
      r -= CUSTOMER_SEED[i][1];
      if (r <= 0) return i;
    }
    return 0;
  };

  const balances: Record<Currency, number> = { NGN: 240_000, USDT: 180 };
  const transactions: Transaction[] = [];
  const history: BalancePoint[] = [];
  let ngnBank = 0;
  let lastNgnWithdrawal = -4;

  const pushPayment = (
    t: number,
    currency: Currency,
    amount: number,
    status: Transaction['status'],
    extra: Partial<Transaction> & { customerId: string; narration: string }
  ) => {
    const fee = paymentFee(amount, currency);
    if (status === 'successful') balances[currency] = round2(balances[currency] + amount - fee);
    const txn: Transaction = {
      id: `txn_${code(rng, 12).toLowerCase()}`,
      reference: `FLX-${code(rng)}`,
      kind: 'payment',
      currency,
      amount,
      fee,
      status,
      createdAt: t,
      method: paymentMethod(currency),
      ...extra,
    };
    transactions.push(txn);
    return txn;
  };

  for (let d = 0; d < HISTORY_DAYS; d++) {
    const dayStart = start + d * DAY_MS;
    const weekday = new Date(dayStart).getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    // Business grows a little over the quarter.
    const count = Math.floor((isWeekend ? 2 : 4) + rng() * 5 + d / 30);

    const events: DayEvent[] = [];
    for (let i = 0; i < count; i++) {
      const customer = pickCustomer();
      const prefersCrypto = CUSTOMER_SEED[customer][2];
      const currency: Currency = rng() < (prefersCrypto ? 0.7 : 0.1) ? 'USDT' : 'NGN';
      events.push({ kind: 'payment', t: dayStart + (7.5 + rng() * 14) * 3_600_000, customer, currency });
    }
    for (const p of special.get(d) ?? []) events.push({ kind: 'special', t: p.t, p });
    // Manual naira withdrawals every few days; the USDT schedule every Friday 17:00.
    if (d - lastNgnWithdrawal >= 4 && rng() < 0.5 && !isWeekend) {
      events.push({ kind: 'withdrawal', t: dayStart + (15 + rng() * 2) * 3_600_000, currency: 'NGN' });
      lastNgnWithdrawal = d;
    }
    if (weekday === 5) {
      events.push({ kind: 'withdrawal', t: dayStart + 17 * 3_600_000, currency: 'USDT' });
    }

    events.sort((a, b) => a.t - b.t);

    for (const ev of events) {
      if (ev.t > now) continue;

      if (ev.kind === 'special') {
        const { p } = ev;
        const txn = pushPayment(p.t, p.currency, p.amount, p.status, {
          customerId: p.customerId,
          narration: p.narration,
          subscriptionId: p.subscriptionId,
          invoiceId: p.invoiceId,
        });
        const inv = p.invoiceId ? invoices.find((x) => x.id === p.invoiceId) : undefined;
        if (inv) inv.txnId = txn.id;
        continue;
      }

      if (ev.kind === 'payment') {
        // About one sale in five comes through a payment link.
        const candidates = links.filter((l) => l.active && l.currency === ev.currency && l.createdAt <= ev.t);
        const link = rng() < 0.22 && candidates.length ? candidates[Math.floor(rng() * candidates.length)] : undefined;
        const amount = link?.amount ?? randomPaymentAmount(rng, ev.currency);
        const recent = now - ev.t < 3 * 3_600_000;
        const status = recent && rng() < 0.35 ? 'pending' : rng() < 0.03 ? 'failed' : 'successful';
        pushPayment(ev.t, ev.currency, amount, status, {
          customerId: customers[ev.customer].id,
          narration: link ? link.title : NARRATIONS[Math.floor(rng() * NARRATIONS.length)],
          linkId: link?.id,
        });
        continue;
      }

      const fee = WITHDRAWAL_FEE[ev.currency];
      const amount =
        ev.currency === 'NGN'
          ? Math.floor((balances.NGN * (0.3 + rng() * 0.2)) / 1000) * 1000
          : round2(balances.USDT - rules.USDT.reserve - fee);
      if (amount <= fee * 10) continue;

      const destinationId = ev.currency === 'USDT' ? 'dst_tron' : ngnBank++ % 3 === 2 ? 'dst_access' : 'dst_gtb';
      balances[ev.currency] = round2(balances[ev.currency] - amount - fee);

      transactions.push({
        id: `txn_${code(rng, 12).toLowerCase()}`,
        reference: `WDR-${code(rng)}`,
        kind: 'withdrawal',
        currency: ev.currency,
        amount,
        fee,
        status: now - ev.t < 2 * 3_600_000 ? 'processing' : 'successful',
        createdAt: ev.t,
        method: ev.currency === 'NGN' ? 'Bank payout' : 'USDT · TRON',
        narration: ev.currency === 'NGN' ? 'Withdrawal to bank' : 'Weekly payout',
        destinationId,
        trigger: ev.currency === 'NGN' ? 'manual' : 'scheduled',
      });
    }

    history.push({ t: dayStart, NGN: balances.NGN, USDT: balances.USDT });
  }

  // ---- Refunds and disputes, debited from the day they happened -----------
  const debitFrom = (currency: Currency, amount: number, at: number) => {
    balances[currency] = round2(balances[currency] - amount);
    const from = startOfDay(at);
    for (const p of history) if (p.t >= from) p[currency] = round2(p[currency] - amount);
  };

  const eligible = transactions.filter(
    (t) =>
      t.kind === 'payment' &&
      t.status === 'successful' &&
      t.currency === 'NGN' &&
      !t.invoiceId &&
      !t.subscriptionId &&
      t.amount >= 10_000 &&
      t.createdAt < now - 3 * DAY_MS
  );
  const taken = new Set<string>();
  const pick = () => {
    for (let tries = 0; tries < 50; tries++) {
      const t = eligible[Math.floor(rng() * eligible.length)];
      if (t && !taken.has(t.id)) {
        taken.add(t.id);
        return t;
      }
    }
    return null;
  };

  const staff = team.filter((m) => m.status === 'active' && m.role !== 'viewer');
  const refunds: Refund[] = [];
  for (let i = 0; i < 7; i++) {
    const txn = pick();
    if (!txn) break;
    const full = rng() < 0.5;
    const amount = full ? txn.amount : Math.round(txn.amount / 2 / 100) * 100;
    const at = Math.min(txn.createdAt + (0.5 + rng() * 2.5) * DAY_MS, now - 3_600_000);
    txn.refunded = amount;
    debitFrom('NGN', amount, at);
    refunds.push({
      id: `rfd_${code(rng, 10).toLowerCase()}`,
      reference: `RFD-${code(rng)}`,
      txnId: txn.id,
      amount,
      currency: 'NGN',
      reason: REFUND_REASONS[Math.floor(rng() * REFUND_REASONS.length)],
      status: 'successful',
      createdAt: at,
      initiatedBy: staff[Math.floor(rng() * staff.length)].name,
    });
  }

  const disputeSeeds: [Dispute['status'], number, number, number?][] = [
    // [status, opened days ago, days to respond, resolved days ago]
    ['needs_response', 2, 7],
    ['under_review', 6, 7],
    ['won', 24, 7, 10],
    ['lost', 34, 7, 18],
  ];
  const disputes: Dispute[] = [];
  disputeSeeds.forEach(([status, openedAgo, dueIn, resolvedAgo], i) => {
    const txn = pick();
    if (!txn) return;
    const openedAt = Math.max(now - openedAgo * DAY_MS, txn.createdAt + DAY_MS);
    const dispute: Dispute = {
      id: `dsp_${code(rng, 10).toLowerCase()}`,
      txnId: txn.id,
      amount: txn.amount,
      currency: txn.currency,
      reason: DISPUTE_REASONS[i % DISPUTE_REASONS.length],
      status,
      openedAt,
      dueBy: openedAt + dueIn * DAY_MS,
      evidence:
        status === 'needs_response'
          ? undefined
          : 'Delivery confirmation signed by the customer, plus WhatsApp chat confirming receipt.',
      resolvedAt: resolvedAgo !== undefined ? now - resolvedAgo * DAY_MS : undefined,
    };
    txn.disputeId = dispute.id;
    if (status === 'lost') debitFrom(txn.currency, txn.amount, dispute.resolvedAt!);
    disputes.push(dispute);
  });

  transactions.sort((a, b) => b.createdAt - a.createdAt);

  // ---- Webhook deliveries for recent events --------------------------------
  const webhooks = buildWebhooks(rng, domain, now);
  const deliveries: WebhookDelivery[] = [];
  const deliver = (event: string, at: number, data: Record<string, unknown>) => {
    for (const w of webhooks) {
      if (!w.enabled || !w.events.includes(event)) continue;
      const failed = rng() < 0.06;
      const base = { endpointId: w.id, event, payload: webhookPayload(event, data, at) };
      deliveries.push({
        ...base,
        id: `evt_${code(rng, 12).toLowerCase()}`,
        status: failed ? 503 : 200,
        attempt: 1,
        at,
        durationMs: Math.round(80 + rng() * 300),
      });
      if (failed) {
        deliveries.push({
          ...base,
          id: `evt_${code(rng, 12).toLowerCase()}`,
          status: 200,
          attempt: 2,
          at: at + 60_000,
          durationMs: Math.round(80 + rng() * 200),
        });
      }
    }
  };
  for (const t of transactions.slice(0, 40)) {
    if (t.status === 'pending' || t.status === 'processing') continue;
    const event =
      t.kind === 'withdrawal'
        ? 'withdrawal.completed'
        : t.status === 'failed'
          ? 'payment.failed'
          : t.subscriptionId
            ? 'subscription.renewed'
            : t.invoiceId
              ? 'invoice.paid'
              : 'payment.successful';
    deliver(event, t.createdAt + 2_000, {
      id: t.id,
      reference: t.reference,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
    });
  }
  for (const r of refunds) {
    deliver('refund.processed', r.createdAt, { id: r.id, transaction: r.txnId, amount: r.amount, currency: r.currency });
  }
  for (const d of disputes) {
    deliver('dispute.opened', d.openedAt, { id: d.id, transaction: d.txnId, amount: d.amount, reason: d.reason });
  }
  deliveries.sort((a, b) => b.at - a.at);

  // ---- Activity log ---------------------------------------------------------
  const you = team.find((m) => m.isYou)!;
  const activity: ActivityEntry[] = [];
  const act = (actor: string, action: string, at: number) =>
    activity.push({ id: `act_${code(rng, 10).toLowerCase()}`, actor, action, at });
  for (const t of transactions) {
    if (t.kind !== 'withdrawal' || t.trigger !== 'manual' || t.createdAt < now - 21 * DAY_MS) continue;
    const dest = destinations.find((x) => x.id === t.destinationId);
    act(rng() < 0.6 ? you.name : 'Tunde Bakare', `Withdrew ${formatMoney(t.amount, t.currency)} to ${dest?.label ?? 'bank'}`, t.createdAt);
  }
  for (const r of refunds) act(r.initiatedBy, `Refunded ${formatMoney(r.amount, r.currency)} (${r.reason.toLowerCase()})`, r.createdAt);
  for (const inv of invoices) if (inv.status !== 'draft') act(you.name, `Sent invoice ${inv.number}`, inv.issuedAt);
  act('Chidinma Eze', 'Invited Emeka Nwosu as Finance', now - 3 * DAY_MS);
  act(you.name, 'Created payment link “International orders”', now - 60 * DAY_MS);
  act(you.name, 'Changed USDT payouts to scheduled (every Friday)', now - 62 * DAY_MS);
  act('Chidinma Eze', 'Rolled the test secret key', now - 12 * DAY_MS);
  act(you.name, 'Signed in from a new device (Chrome on macOS, Abuja)', now - 4 * DAY_MS);
  act('Tunde Bakare', 'Exported transactions (CSV)', now - 2 * DAY_MS);
  activity.sort((a, b) => b.at - a.at);

  // ---- Notifications --------------------------------------------------------
  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? 'A customer';
  const shortDate = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const notices: Notice[] = [];
  const openDispute = disputes.find((d) => d.status === 'needs_response');
  if (openDispute) {
    notices.push({
      id: 'ntc_dsp',
      title: 'A dispute needs your response',
      body: `${formatMoney(openDispute.amount, openDispute.currency)} · respond by ${shortDate(openDispute.dueBy)}`,
      at: openDispute.openedAt,
      read: false,
      href: 'disputes',
    });
  }
  const overdue = undefined as (typeof invoices)[number] | undefined; // Invoices are hidden from the nav for now.
  if (overdue) {
    notices.push({
      id: 'ntc_inv',
      title: `Invoice ${overdue.number} is overdue`,
      body: `${nameOf(overdue.customerId)} · ${formatMoney(invoiceTotal(overdue), overdue.currency)}`,
      at: overdue.dueAt,
      read: false,
      href: 'invoices',
    });
  }
  const failedSub = undefined as (typeof subscriptions)[number] | undefined; // Subscriptions are hidden for now.
  if (failedSub) {
    notices.push({
      id: 'ntc_sub',
      title: 'A subscription renewal failed',
      body: `${nameOf(failedSub.customerId)} · we’ll retry tomorrow`,
      at: now - 20 * 3_600_000,
      read: false,
      href: 'subscriptions',
    });
  }
  const lastSweep = transactions.find((t) => t.kind === 'withdrawal' && t.trigger === 'scheduled');
  if (lastSweep) {
    notices.push({
      id: 'ntc_wdr',
      title: 'Weekly USDT payout sent',
      body: formatMoney(lastSweep.amount, lastSweep.currency),
      at: lastSweep.createdAt,
      read: true,
      href: 'settings/payouts',
    });
  }
  notices.push({
    id: 'ntc_kyb',
    title: 'Raise your limits',
    body: 'Upload an AML policy to move to tier 3.',
    at: now - 9 * DAY_MS,
    read: true,
    href: 'settings/verification',
  });
  notices.sort((a, b) => b.at - a.at);

  return {
    balances,
    customers,
    transactions,
    destinations,
    rules,
    team,
    history,
    links,
    invoices,
    plans,
    subscriptions,
    refunds: refunds.sort((a, b) => b.createdAt - a.createdAt),
    disputes: disputes.sort((a, b) => b.openedAt - a.openedAt),
    apiKeys: buildApiKeys(rng, now),
    webhooks,
    deliveries,
    business: buildBusiness(businessName, domain),
    checkout: buildCheckout(businessName),
    notifications: { ...DEFAULT_NOTIFICATIONS },
    security: buildSecurity(now),
    verification: buildVerification(now),
    activity,
    notices,
  };
}

export { mulberry32 };
