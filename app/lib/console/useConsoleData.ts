'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { buildDemoData, paymentFee, paymentMethod, randomPaymentAmount } from './demoData';
import { addInterval, invoiceTotal, token, webhookPayload } from './demoCatalog';
import { WITHDRAWAL_FEE, convert, formatMoney, NGN_PER_USDT } from './format';
import type {
  ApiMode,
  BusinessProfile,
  CheckoutSettings,
  ConsoleData,
  Currency,
  Customer,
  Destination,
  Invoice,
  InvoiceItem,
  NotificationKey,
  PaymentLink,
  PayoutRule,
  PayoutTrigger,
  Plan,
  Refund,
  Role,
  SecuritySettings,
  SubscriptionStatus,
  Transaction,
  WebhookEndpoint,
} from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;
const randomCode = (n = 8) => Math.random().toString(36).slice(2, 2 + n).toUpperCase().padEnd(n, '0');
const newId = (prefix: string) => `${prefix}_${randomCode(10).toLowerCase()}`;

/* ------------------------------------------------------------------ */
/* Pure state helpers — each returns a new ConsoleData                 */
/* ------------------------------------------------------------------ */

/** Moves a balance and keeps today's point on the graph in step with it. */
function adjustBalance(d: ConsoleData, currency: Currency, delta: number): ConsoleData {
  const next = round2(d.balances[currency] + delta);
  const history = d.history.slice();
  const last = history[history.length - 1];
  if (last) history[history.length - 1] = { ...last, [currency]: next };
  return { ...d, balances: { ...d.balances, [currency]: next }, history };
}

const youName = (d: ConsoleData) => d.team.find((m) => m.isYou)?.name ?? 'You';

/** Records something a person did, for Settings → Activity. */
function log(d: ConsoleData, action: string, actor = youName(d)): ConsoleData {
  return { ...d, activity: [{ id: newId('act'), actor, action, at: Date.now() }, ...d.activity] };
}

/** Delivers an event to every enabled endpoint subscribed to it. */
function emit(d: ConsoleData, event: string, data: Record<string, unknown>): ConsoleData {
  const at = Date.now();
  const deliveries = d.webhooks
    .filter((w) => w.enabled && w.events.includes(event))
    .map((w) => ({
      id: newId('evt'),
      endpointId: w.id,
      event,
      status: 200,
      attempt: 1,
      at,
      durationMs: Math.round(90 + Math.random() * 250),
      payload: webhookPayload(event, data, at),
    }));
  return deliveries.length ? { ...d, deliveries: [...deliveries, ...d.deliveries] } : d;
}

function addNotice(d: ConsoleData, title: string, body: string, href?: string): ConsoleData {
  return {
    ...d,
    notices: [{ id: newId('ntc'), title, body, href, at: Date.now(), read: false }, ...d.notices].slice(0, 40),
  };
}

function patchTxn(d: ConsoleData, id: string, patch: Partial<Transaction>): ConsoleData {
  return { ...d, transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

export interface WithdrawRequest {
  from: Currency;
  amount: number;
  destinationId: string;
  trigger: PayoutTrigger;
}

export interface NewInvoice {
  customerId: string;
  currency: Currency;
  items: InvoiceItem[];
  dueAt: number;
  note: string;
}

/**
 * The console's whole simulated backend: state plus the operations a merchant
 * can perform on it. Money that "moves" passes through a processing state
 * first, so the UI shows the same lifecycle a real gateway would — and every
 * change fires the webhooks, activity entries and notifications it would.
 */
export function useConsoleData(
  businessName: string,
  ownerEmail: string,
  notify: (message: string) => void,
  seed?: number
) {
  const [data, setData] = useState<ConsoleData>(() => buildDemoData(businessName, ownerEmail, seed));

  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });

  const timers = useRef<number[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  // Latest committed state, for validating a request before it is queued.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  /* ---------------------------------------------------------------- */
  /* Money in & out                                                   */
  /* ---------------------------------------------------------------- */

  const withdraw = useCallback(
    (req: WithdrawRequest): Transaction | null => {
      const fee = WITHDRAWAL_FEE[req.from];
      const current = dataRef.current;
      const destination = current.destinations.find((x) => x.id === req.destinationId);
      const fits = (balance: number) => req.amount > 0 && req.amount + fee <= balance + 1e-9;
      if (!destination || !fits(current.balances[req.from])) return null;

      const crosses = destination.currency !== req.from;
      const txn: Transaction = {
        id: newId('txn'),
        reference: `WDR-${randomCode()}`,
        kind: 'withdrawal',
        currency: req.from,
        amount: round2(req.amount),
        fee,
        status: 'processing',
        createdAt: Date.now(),
        method: destination.type === 'bank' ? 'Bank payout' : `USDT · ${destination.network}`,
        narration:
          req.trigger === 'automatic'
            ? 'Automatic payout'
            : req.trigger === 'scheduled'
              ? 'Scheduled payout'
              : destination.type === 'bank'
                ? 'Withdrawal to bank'
                : 'Withdrawal to wallet',
        destinationId: destination.id,
        trigger: req.trigger,
        converted: crosses
          ? { currency: destination.currency, amount: convert(req.amount, req.from, destination.currency), rate: NGN_PER_USDT }
          : undefined,
      };

      // Re-checked inside the updater so two triggers racing on the same
      // balance can never overdraw it.
      setData((d) => {
        if (!fits(d.balances[req.from])) return d;
        let next = adjustBalance({ ...d, transactions: [txn, ...d.transactions] }, req.from, -(req.amount + fee));
        if (req.trigger === 'manual') {
          next = log(next, `Withdrew ${formatMoney(req.amount, req.from)} to ${destination.label}`);
        }
        return next;
      });

      later(4000, () =>
        setData((d) => {
          const t = d.transactions.find((x) => x.id === txn.id);
          if (!t || t.status !== 'processing') return d;
          return emit(patchTxn(d, txn.id, { status: 'successful' }), 'withdrawal.completed', {
            id: txn.id,
            reference: txn.reference,
            amount: txn.amount,
            currency: txn.currency,
          });
        })
      );

      return txn;
    },
    [later]
  );

  /** Credits a payment after a short pending window, like a real confirmation. */
  const receivePayment = useCallback(
    (txn: Transaction, delayMs: number, onSettled?: (d: ConsoleData) => ConsoleData) => {
      setData((d) => ({ ...d, transactions: [txn, ...d.transactions] }));
      later(delayMs, () => {
        setData((d) => {
          const current = d.transactions.find((t) => t.id === txn.id);
          if (!current || current.status !== 'pending') return d;
          let next = adjustBalance(patchTxn(d, txn.id, { status: 'successful' }), txn.currency, txn.amount - txn.fee);
          next = emit(next, 'payment.successful', {
            id: txn.id,
            reference: txn.reference,
            amount: txn.amount,
            currency: txn.currency,
          });
          return onSettled ? onSettled(next) : next;
        });
      });
    },
    [later]
  );

  /** A customer pays: pending for a moment, then credited. */
  const simulatePayment = useCallback(() => {
    const { customers, links } = dataRef.current;
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const currency: Currency = Math.random() < 0.8 ? 'NGN' : 'USDT';
    const linkPool = links.filter((l) => l.active && l.currency === currency);
    const link = Math.random() < 0.3 && linkPool.length ? linkPool[Math.floor(Math.random() * linkPool.length)] : undefined;
    const amount = link?.amount ?? randomPaymentAmount(Math.random, currency);
    const txn: Transaction = {
      id: newId('txn'),
      reference: `FLX-${randomCode()}`,
      kind: 'payment',
      currency,
      amount,
      fee: paymentFee(amount, currency),
      status: 'pending',
      createdAt: Date.now(),
      method: paymentMethod(currency),
      narration: link?.title ?? 'Online checkout',
      customerId: customer.id,
      linkId: link?.id,
    };
    receivePayment(txn, 2500);
    later(2500, () => notifyRef.current(`Payment received · ${formatMoney(amount, currency)} from ${customer.name}`));
  }, [receivePayment, later]);

  // Automatic payout rules: whenever a balance crosses its threshold, sweep it
  // down to the reserve.
  useEffect(() => {
    for (const currency of ['NGN', 'USDT'] as const) {
      const rule = data.rules[currency];
      if (rule.mode !== 'automatic' || data.balances[currency] < rule.threshold) continue;
      const amount = round2(data.balances[currency] - rule.reserve - WITHDRAWAL_FEE[currency]);
      if (amount <= 0) continue;
      const txn = withdraw({ from: currency, amount, destinationId: rule.destinationId, trigger: 'automatic' });
      if (txn) notifyRef.current(`Automatic payout started · ${formatMoney(amount, currency)}`);
    }
  }, [data.balances, data.rules, withdraw]);

  const updateRule = useCallback((rule: PayoutRule) => {
    setData((d) => log({ ...d, rules: { ...d.rules, [rule.currency]: rule } }, `Changed ${rule.currency} payouts to ${rule.mode}`));
  }, []);

  const addDestination = useCallback((dest: Destination) => {
    setData((d) => log({ ...d, destinations: [...d.destinations, dest] }, `Added payout account “${dest.label}”`));
  }, []);

  const removeDestination = useCallback((id: string) => {
    setData((d) => {
      const dest = d.destinations.find((x) => x.id === id);
      return log({ ...d, destinations: d.destinations.filter((x) => x.id !== id) }, `Removed payout account “${dest?.label}”`);
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /* Refunds & disputes                                               */
  /* ---------------------------------------------------------------- */

  /** Returns an error message, or null when the refund was started. */
  const refund = useCallback(
    (txnId: string, amount: number, reason: string): string | null => {
      const d0 = dataRef.current;
      const txn = d0.transactions.find((t) => t.id === txnId);
      if (!txn || txn.kind !== 'payment' || txn.status !== 'successful') return 'This payment can’t be refunded.';
      const left = round2(txn.amount - (txn.refunded ?? 0));
      if (amount <= 0 || amount > left + 1e-9) return `You can refund up to ${formatMoney(left, txn.currency)}.`;
      if (amount > d0.balances[txn.currency]) return `Your ${txn.currency} balance is too low for this refund.`;

      const r: Refund = {
        id: newId('rfd'),
        reference: `RFD-${randomCode()}`,
        txnId,
        amount: round2(amount),
        currency: txn.currency,
        reason,
        status: 'processing',
        createdAt: Date.now(),
        initiatedBy: youName(d0),
      };
      setData((d) => {
        let next = patchTxn(d, txnId, { refunded: round2((txn.refunded ?? 0) + amount) });
        next = adjustBalance({ ...next, refunds: [r, ...next.refunds] }, txn.currency, -amount);
        return log(next, `Refunded ${formatMoney(amount, txn.currency)} on ${txn.reference}`);
      });
      later(3000, () => {
        setData((d) => {
          let next: ConsoleData = { ...d, refunds: d.refunds.map((x) => (x.id === r.id ? { ...x, status: 'successful' } : x)) };
          next = emit(next, 'refund.processed', { id: r.id, transaction: txnId, amount: r.amount, currency: r.currency });
          return addNotice(next, 'Refund completed', `${formatMoney(r.amount, r.currency)} returned to the customer`, 'refunds');
        });
        notifyRef.current(`Refund completed · ${formatMoney(r.amount, r.currency)}`);
      });
      return null;
    },
    [later]
  );

  const respondToDispute = useCallback(
    (id: string, evidence: string) => {
      setData((d) =>
        log(
          { ...d, disputes: d.disputes.map((x) => (x.id === id ? { ...x, status: 'under_review', evidence } : x)) },
          'Submitted evidence for a dispute'
        )
      );
      // The demo bank decides quickly — and usually in the merchant's favour.
      later(8000, () => {
        const won = Math.random() < 0.75;
        setData((d) => {
          const dispute = d.disputes.find((x) => x.id === id);
          if (!dispute || dispute.status !== 'under_review') return d;
          let next: ConsoleData = {
            ...d,
            disputes: d.disputes.map((x) => (x.id === id ? { ...x, status: won ? 'won' : 'lost', resolvedAt: Date.now() } : x)),
          };
          if (!won) next = adjustBalance(next, dispute.currency, -dispute.amount);
          next = emit(next, 'dispute.resolved', { id, outcome: won ? 'won' : 'lost' });
          return addNotice(
            next,
            won ? 'Dispute won' : 'Dispute lost',
            `${formatMoney(dispute.amount, dispute.currency)} ${won ? 'stays in your balance' : 'was returned to the customer'}`,
            'disputes'
          );
        });
        notifyRef.current(won ? 'Dispute won — the money stays with you' : 'Dispute lost — the amount was returned');
      });
    },
    [later]
  );

  const acceptDispute = useCallback((id: string) => {
    setData((d) => {
      const dispute = d.disputes.find((x) => x.id === id);
      if (!dispute || dispute.status !== 'needs_response') return d;
      const next = adjustBalance(
        { ...d, disputes: d.disputes.map((x) => (x.id === id ? { ...x, status: 'accepted', resolvedAt: Date.now() } : x)) },
        dispute.currency,
        -dispute.amount
      );
      return log(next, `Accepted a dispute of ${formatMoney(dispute.amount, dispute.currency)}`);
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /* Payment links, invoices, subscriptions                           */
  /* ---------------------------------------------------------------- */

  const createLink = useCallback((input: Pick<PaymentLink, 'title' | 'description' | 'amount' | 'currency'>): PaymentLink => {
    const base = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'link';
    const link: PaymentLink = {
      ...input,
      id: newId('lnk'),
      slug: `${base}-${randomCode(4).toLowerCase()}`,
      active: true,
      createdAt: Date.now(),
    };
    setData((d) => log({ ...d, links: [link, ...d.links] }, `Created payment link “${link.title}”`));
    return link;
  }, []);

  const setLinkActive = useCallback((id: string, active: boolean) => {
    setData((d) => {
      const link = d.links.find((l) => l.id === id);
      return log(
        { ...d, links: d.links.map((l) => (l.id === id ? { ...l, active } : l)) },
        `${active ? 'Turned on' : 'Turned off'} payment link “${link?.title}”`
      );
    });
  }, []);

  const createInvoice = useCallback((input: NewInvoice, send: boolean): Invoice => {
    const d0 = dataRef.current;
    const highest = d0.invoices.reduce((m, i) => Math.max(m, Number(i.number.replace(/\D/g, '')) || 0), 0);
    const number = `INV-${String(highest + 1).padStart(4, '0')}`;
    const invoice: Invoice = {
      ...input,
      id: newId('inv'),
      number,
      status: send ? 'sent' : 'draft',
      issuedAt: Date.now(),
    };
    setData((d) => log({ ...d, invoices: [invoice, ...d.invoices] }, `${send ? 'Sent' : 'Drafted'} invoice ${number}`));
    return invoice;
  }, []);

  const sendInvoice = useCallback((id: string) => {
    setData((d) => {
      const inv = d.invoices.find((i) => i.id === id);
      return log(
        { ...d, invoices: d.invoices.map((i) => (i.id === id ? { ...i, status: 'sent', issuedAt: Date.now() } : i)) },
        `Sent invoice ${inv?.number}`
      );
    });
  }, []);

  const remindInvoice = useCallback((id: string) => {
    setData((d) => log(d, `Sent a reminder for invoice ${d.invoices.find((i) => i.id === id)?.number}`));
  }, []);

  const voidInvoice = useCallback((id: string) => {
    setData((d) => {
      const inv = d.invoices.find((i) => i.id === id);
      return log({ ...d, invoices: d.invoices.map((i) => (i.id === id ? { ...i, status: 'void' } : i)) }, `Voided invoice ${inv?.number}`);
    });
  }, []);

  /** The customer pays the invoice (simulated) — a real payment lands in the ledger. */
  const payInvoice = useCallback(
    (id: string) => {
      const inv = dataRef.current.invoices.find((i) => i.id === id);
      if (!inv || inv.status !== 'sent') return;
      const amount = invoiceTotal(inv);
      const txn: Transaction = {
        id: newId('txn'),
        reference: `FLX-${randomCode()}`,
        kind: 'payment',
        currency: inv.currency,
        amount,
        fee: paymentFee(amount, inv.currency),
        status: 'pending',
        createdAt: Date.now(),
        method: paymentMethod(inv.currency),
        narration: `Invoice ${inv.number}`,
        customerId: inv.customerId,
        invoiceId: inv.id,
      };
      receivePayment(txn, 2000, (d) => {
        const next: ConsoleData = {
          ...d,
          invoices: d.invoices.map((i) => (i.id === id ? { ...i, status: 'paid', paidAt: Date.now(), txnId: txn.id } : i)),
        };
        return addNotice(emit(next, 'invoice.paid', { id, number: inv.number, amount }), `Invoice ${inv.number} paid`, formatMoney(amount, inv.currency), 'invoices');
      });
      later(2000, () => notifyRef.current(`Invoice ${inv.number} paid · ${formatMoney(amount, inv.currency)}`));
    },
    [receivePayment, later]
  );

  const createPlan = useCallback((input: Pick<Plan, 'name' | 'description' | 'amount' | 'currency' | 'interval'>) => {
    const plan: Plan = { ...input, id: newId('pln'), active: true, createdAt: Date.now() };
    setData((d) => log({ ...d, plans: [...d.plans, plan] }, `Created plan “${plan.name}”`));
    return plan;
  }, []);

  const setPlanActive = useCallback((id: string, active: boolean) => {
    setData((d) => {
      const plan = d.plans.find((p) => p.id === id);
      return log({ ...d, plans: d.plans.map((p) => (p.id === id ? { ...p, active } : p)) }, `${active ? 'Reopened' : 'Archived'} plan “${plan?.name}”`);
    });
  }, []);

  const setSubscriptionStatus = useCallback((id: string, status: SubscriptionStatus) => {
    setData((d) => {
      const sub = d.subscriptions.find((s) => s.id === id);
      const plan = d.plans.find((p) => p.id === sub?.planId);
      if (!sub || !plan) return d;
      const now = Date.now();
      const nextBillingAt = status === 'active' ? addInterval(now, plan.interval, 1) : null;
      const verb = status === 'active' ? 'Resumed' : status === 'paused' ? 'Paused' : 'Cancelled';
      let next: ConsoleData = {
        ...d,
        subscriptions: d.subscriptions.map((s) =>
          s.id === id ? { ...s, status, nextBillingAt, cancelledAt: status === 'cancelled' ? now : s.cancelledAt } : s
        ),
      };
      if (status === 'cancelled') next = emit(next, 'subscription.cancelled', { id });
      const customer = d.customers.find((c) => c.id === sub.customerId);
      return log(next, `${verb} ${customer?.name}’s ${plan.name} subscription`);
    });
  }, []);

  const subscribeCustomer = useCallback(
    (customerId: string, planId: string) => {
      const d0 = dataRef.current;
      const plan = d0.plans.find((p) => p.id === planId);
      const customer = d0.customers.find((c) => c.id === customerId);
      if (!plan || !customer) return;
      const now = Date.now();
      const sub = {
        id: newId('sub'),
        planId,
        customerId,
        status: 'active' as const,
        startedAt: now,
        nextBillingAt: addInterval(now, plan.interval, 1),
      };
      setData((d) => log(emit({ ...d, subscriptions: [sub, ...d.subscriptions] }, 'subscription.created', { id: sub.id, plan: planId }), `Subscribed ${customer.name} to ${plan.name}`));
      // The first charge goes through straight away.
      receivePayment(
        {
          id: newId('txn'),
          reference: `FLX-${randomCode()}`,
          kind: 'payment',
          currency: plan.currency,
          amount: plan.amount,
          fee: paymentFee(plan.amount, plan.currency),
          status: 'pending',
          createdAt: now,
          method: paymentMethod(plan.currency),
          narration: `Subscription · ${plan.name}`,
          customerId,
          subscriptionId: sub.id,
        },
        2000
      );
    },
    [receivePayment]
  );

  const addCustomer = useCallback((input: Pick<Customer, 'name' | 'email' | 'phone'>): Customer => {
    const customer: Customer = { ...input, id: newId('cus'), joinedAt: Date.now() };
    setData((d) => log({ ...d, customers: [customer, ...d.customers] }, `Added customer ${customer.name}`));
    return customer;
  }, []);

  /* ---------------------------------------------------------------- */
  /* Developers                                                       */
  /* ---------------------------------------------------------------- */

  const rollSecretKey = useCallback((mode: ApiMode) => {
    setData((d) =>
      log(
        {
          ...d,
          apiKeys: {
            ...d.apiKeys,
            [mode]: { ...d.apiKeys[mode], secretKey: `sk_${mode}_${token(Math.random, 40)}`, createdAt: Date.now(), lastUsedAt: null },
          },
        },
        `Rolled the ${mode} secret key`
      )
    );
  }, []);

  const addWebhook = useCallback((url: string, events: string[]) => {
    const endpoint: WebhookEndpoint = {
      id: newId('whk'),
      url,
      events,
      secret: `whsec_${token(Math.random, 32)}`,
      enabled: true,
      createdAt: Date.now(),
    };
    setData((d) => log({ ...d, webhooks: [...d.webhooks, endpoint] }, `Added webhook endpoint ${url}`));
  }, []);

  const updateWebhook = useCallback((id: string, patch: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'enabled'>>) => {
    setData((d) => ({ ...d, webhooks: d.webhooks.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
  }, []);

  const removeWebhook = useCallback((id: string) => {
    setData((d) => {
      const w = d.webhooks.find((x) => x.id === id);
      return log({ ...d, webhooks: d.webhooks.filter((x) => x.id !== id) }, `Removed webhook endpoint ${w?.url}`);
    });
  }, []);

  const sendTestEvent = useCallback((endpointId: string, event: string) => {
    setData((d) => {
      const at = Date.now();
      const delivery = {
        id: newId('evt'),
        endpointId,
        event,
        status: 200,
        attempt: 1,
        at,
        durationMs: Math.round(90 + Math.random() * 200),
        payload: webhookPayload(event, { id: 'test_event', test: true, amount: 10_000, currency: 'NGN' }, at),
      };
      return { ...d, deliveries: [delivery, ...d.deliveries] };
    });
  }, []);

  const retryDelivery = useCallback((id: string) => {
    setData((d) => {
      const original = d.deliveries.find((x) => x.id === id);
      if (!original) return d;
      const retry = { ...original, id: newId('evt'), status: 200, attempt: original.attempt + 1, at: Date.now(), durationMs: Math.round(90 + Math.random() * 200) };
      return { ...d, deliveries: [retry, ...d.deliveries] };
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /* Settings & team                                                  */
  /* ---------------------------------------------------------------- */

  const updateBusiness = useCallback((business: BusinessProfile) => {
    setData((d) => log({ ...d, business }, 'Updated the business profile'));
  }, []);

  const updateCheckout = useCallback((checkout: CheckoutSettings) => {
    setData((d) => log({ ...d, checkout }, 'Updated checkout settings'));
  }, []);

  const setNotification = useCallback((key: NotificationKey, on: boolean) => {
    setData((d) => ({ ...d, notifications: { ...d.notifications, [key]: on } }));
  }, []);

  const updateSecurity = useCallback((patch: Partial<Omit<SecuritySettings, 'sessions'>>, action: string) => {
    setData((d) => log({ ...d, security: { ...d.security, ...patch } }, action));
  }, []);

  const revokeSession = useCallback((id: string) => {
    setData((d) => {
      const s = d.security.sessions.find((x) => x.id === id);
      return log({ ...d, security: { ...d.security, sessions: d.security.sessions.filter((x) => x.id !== id) } }, `Signed out ${s?.device}`);
    });
  }, []);

  const uploadDocument = useCallback(
    (id: string) => {
      setData((d) => ({
        ...d,
        verification: {
          ...d.verification,
          documents: d.verification.documents.map((doc) => (doc.id === id ? { ...doc, status: 'in_review', uploadedAt: Date.now() } : doc)),
        },
      }));
      later(6000, () => {
        setData((d) => {
          const doc = d.verification.documents.find((x) => x.id === id);
          const documents = d.verification.documents.map((x) => (x.id === id ? { ...x, status: 'approved' as const } : x));
          const allApproved = documents.every((x) => x.status === 'approved');
          const verification = {
            ...d.verification,
            documents,
            tier: allApproved ? 3 : d.verification.tier,
            limits: allApproved ? { perTransaction: 50_000_000, daily: 250_000_000 } : d.verification.limits,
          };
          return addNotice({ ...d, verification }, `${doc?.name} approved`, allApproved ? 'You’re now on tier 3 with higher limits.' : 'Thanks — it’s on file.', 'settings/verification');
        });
      });
    },
    [later]
  );

  const markNoticesRead = useCallback(() => {
    setData((d) => (d.notices.some((n) => !n.read) ? { ...d, notices: d.notices.map((n) => ({ ...n, read: true })) } : d));
  }, []);

  const inviteMember = useCallback((name: string, email: string, role: Role) => {
    setData((d) =>
      log(
        { ...d, team: [...d.team, { id: newId('usr'), name, email, role, status: 'invited', lastActiveAt: null }] },
        `Invited ${name} as ${role[0].toUpperCase()}${role.slice(1)}`
      )
    );
  }, []);

  const updateMemberRole = useCallback((id: string, role: Role) => {
    setData((d) => {
      const m = d.team.find((x) => x.id === id);
      return log({ ...d, team: d.team.map((x) => (x.id === id ? { ...x, role } : x)) }, `Changed ${m?.name}’s role to ${role}`);
    });
  }, []);

  const removeMember = useCallback((id: string) => {
    setData((d) => {
      const m = d.team.find((x) => x.id === id);
      return log({ ...d, team: d.team.filter((x) => x.id !== id) }, `Removed ${m?.name} from the team`);
    });
  }, []);

  return {
    data,
    withdraw,
    simulatePayment,
    updateRule,
    addDestination,
    removeDestination,
    refund,
    respondToDispute,
    acceptDispute,
    createLink,
    setLinkActive,
    createInvoice,
    sendInvoice,
    remindInvoice,
    voidInvoice,
    payInvoice,
    createPlan,
    setPlanActive,
    setSubscriptionStatus,
    subscribeCustomer,
    addCustomer,
    rollSecretKey,
    addWebhook,
    updateWebhook,
    removeWebhook,
    sendTestEvent,
    retryDelivery,
    updateBusiness,
    updateCheckout,
    setNotification,
    updateSecurity,
    revokeSession,
    uploadDocument,
    markNoticesRead,
    inviteMember,
    updateMemberRole,
    removeMember,
  };
}

export type ConsoleActions = Omit<ReturnType<typeof useConsoleData>, 'data'>;
