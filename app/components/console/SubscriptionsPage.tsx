'use client';

import React, { useMemo, useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';

import { DAY_MS, formatDate, formatMoney, toNgn } from '../../lib/console/format';
import { useNow } from '../../lib/console/useNow';
import type { Currency, Plan, PlanInterval } from '../../lib/console/types';
import { SUBSCRIPTION_STATUS, canMoveMoney, type PageProps } from './nav';
import {
  Avatar,
  Button,
  Card,
  DetailList,
  Drawer,
  EmptyState,
  Field,
  Modal,
  Money,
  PageHeader,
  Pill,
  Segmented,
  StatStrip,
  Tabs,
  cx,
  inputClass,
  selectClass,
} from './ui';
import { TxnListItem } from './txn';

const INTERVAL_LABEL: Record<PlanInterval, string> = { weekly: 'week', monthly: 'month', yearly: 'year' };

/** A plan's price as a monthly naira figure, for MRR. */
const monthlyNgn = (p: Plan) =>
  toNgn(p.amount, p.currency) * (p.interval === 'weekly' ? 52 / 12 : p.interval === 'yearly' ? 1 / 12 : 1);

function NewPlanModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Pick<Plan, 'name' | 'description' | 'amount' | 'currency' | 'interval'>) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('NGN');
  const [interval, setInterval] = useState<PlanInterval>('monthly');
  const [touched, setTouched] = useState(false);
  const value = Number(amount) || 0;
  const error = !name.trim() ? 'Name the plan.' : value <= 0 ? 'Enter a price.' : null;

  return (
    <Modal
      open
      onClose={onClose}
      title="New plan"
      description="Customers on this plan are charged automatically each period."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTouched(true);
              if (error) return;
              onCreate({ name: name.trim(), description: description.trim(), amount: value, currency, interval });
              onClose();
            }}
          >
            Create plan
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Plan name" htmlFor="plan-name">
          <input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kaz Box · Monthly" className={inputClass} />
        </Field>
        <Field label="Description" htmlFor="plan-desc" hint="Optional">
          <input id="plan-desc" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price" htmlFor="plan-amount" error={touched && error ? error : undefined}>
            <div className="relative">
              <input
                id="plan-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0.00"
                className={cx(inputClass, '!pr-16 font-mono')}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3">{currency}</span>
            </div>
          </Field>
          <div>
            <p className="text-sm font-medium text-ink-2 mb-2">Currency</p>
            <Segmented<Currency>
              label="Currency"
              value={currency}
              onChange={setCurrency}
              className="w-full"
              options={[
                { value: 'NGN', label: 'NGN' },
                { value: 'USDT', label: 'USDT' },
              ]}
            />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-2 mb-2">Bill every</p>
          <Segmented<PlanInterval>
            label="Billing interval"
            value={interval}
            onChange={setInterval}
            className="w-full"
            options={[
              { value: 'weekly', label: 'Week' },
              { value: 'monthly', label: 'Month' },
              { value: 'yearly', label: 'Year' },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}

function AddSubscriberModal({
  data,
  onClose,
  onAdd,
}: {
  data: PageProps['data'];
  onClose: () => void;
  onAdd: (customerId: string, planId: string) => void;
}) {
  const plans = data.plans.filter((p) => p.active);
  const [customerId, setCustomerId] = useState(data.customers[0]?.id ?? '');
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const plan = plans.find((p) => p.id === planId);
  return (
    <Modal
      open
      onClose={onClose}
      title="Add a subscriber"
      description="The first charge is taken now, then every billing period."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!customerId || !planId}
            onClick={() => {
              onAdd(customerId, planId);
              onClose();
            }}
          >
            Subscribe
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Customer" htmlFor="sub-customer">
          <select id="sub-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={selectClass}>
            {data.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Plan" htmlFor="sub-plan">
          <select id="sub-plan" value={planId} onChange={(e) => setPlanId(e.target.value)} className={selectClass}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatMoney(p.amount, p.currency)} / {INTERVAL_LABEL[p.interval]}
              </option>
            ))}
          </select>
        </Field>
        {plan && (
          <p className="text-sm text-ink-2">
            {formatMoney(plan.amount, plan.currency)} will be charged today and every {INTERVAL_LABEL[plan.interval]} after.
          </p>
        )}
      </div>
    </Modal>
  );
}

export default function SubscriptionsPage({ data, store, role, sub, notify, onNavigate, onOpenTxn }: PageProps) {
  const tab = sub === 'plans' ? 'plans' : 'subscribers';
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const now = useNow();
  const manage = canMoveMoney(role);

  const planOf = (id: string) => data.plans.find((p) => p.id === id);
  const customerOf = (id: string) => data.customers.find((c) => c.id === id);

  const stats = useMemo(() => {
    const live = data.subscriptions.filter((s) => s.status === 'active');
    const mrr = live.reduce((sum, s) => {
      const p = data.plans.find((x) => x.id === s.planId);
      return p ? sum + monthlyNgn(p) : sum;
    }, 0);
    return {
      mrr,
      active: live.length,
      pastDue: data.subscriptions.filter((s) => s.status === 'past_due').length,
      churned: data.subscriptions.filter((s) => s.status === 'cancelled' && (s.cancelledAt ?? 0) >= now - 30 * DAY_MS).length,
    };
  }, [data.subscriptions, data.plans, now]);

  const open = openId ? data.subscriptions.find((s) => s.id === openId) ?? null : null;
  const openPlan = open ? planOf(open.planId) : undefined;
  const openCharges = open ? data.transactions.filter((t) => t.subscriptionId === open.id) : [];

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Recurring billing for your plans."
        actions={
          manage &&
          (tab === 'plans' ? (
            <Button variant="primary" onClick={() => setCreatingPlan(true)}>
              <Plus className="size-4" />
              New plan
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <UserPlus className="size-4" />
              Add subscriber
            </Button>
          ))
        }
      />

      <StatStrip
        items={[
          { label: 'Monthly recurring revenue', value: formatMoney(stats.mrr, 'NGN', { compact: true }), hint: 'Active plans, in naira' },
          { label: 'Active subscribers', value: stats.active },
          { label: 'Past due', value: stats.pastDue, hint: 'Renewal failed — retrying' },
          { label: 'Cancelled · 30 days', value: stats.churned },
        ]}
      />

      <Tabs
        label="Subscriptions view"
        value={tab}
        onChange={(v) => onNavigate('subscriptions', v === 'plans' ? 'plans' : undefined)}
        tabs={[
          { value: 'subscribers', label: 'Subscribers', count: data.subscriptions.length },
          { value: 'plans', label: 'Plans', count: data.plans.length },
        ]}
      />

      {tab === 'subscribers' ? (
        <Card className="overflow-hidden">
          {data.subscriptions.length === 0 ? (
            <EmptyState title="No subscribers yet" />
          ) : (
            <ul className="divide-y divide-line">
              {data.subscriptions.map((s) => {
                const p = planOf(s.planId);
                const c = customerOf(s.customerId);
                const st = SUBSCRIPTION_STATUS[s.status];
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(s.id)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-subtle cursor-pointer transition-colors"
                    >
                      <Avatar name={c?.name ?? '?'} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink truncate">{c?.name}</span>
                        <span className="block text-xs text-ink-3 truncate">{p?.name}</span>
                      </span>
                      <span className="hidden md:block w-40 text-right">
                        {p && (
                          <span className="text-sm text-ink">
                            <Money amount={p.amount} currency={p.currency} /> <span className="text-ink-3">/ {INTERVAL_LABEL[p.interval]}</span>
                          </span>
                        )}
                      </span>
                      <span className="hidden sm:block w-40 text-right text-xs text-ink-3">
                        {s.nextBillingAt ? `Next: ${formatDate(s.nextBillingAt)}` : '—'}
                      </span>
                      <span className="w-28 text-right">
                        <Pill tone={st.tone}>{st.label}</Pill>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.plans.map((p) => {
            const subscribers = data.subscriptions.filter((s) => s.planId === p.id && s.status === 'active').length;
            return (
              <Card key={p.id} className={cx('p-5 flex flex-col', !p.active && 'opacity-60')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{p.name}</p>
                    <p className="mt-0.5 text-sm text-ink-3">{p.description}</p>
                  </div>
                  {!p.active && <Pill tone="neutral">Archived</Pill>}
                </div>
                <p className="mt-4">
                  <Money amount={p.amount} currency={p.currency} className="text-2xl font-semibold text-ink" />
                  <span className="text-sm text-ink-3"> / {INTERVAL_LABEL[p.interval]}</span>
                </p>
                <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-sm text-ink-2">
                    {subscribers} active · {formatMoney(subscribers * monthlyNgn(p), 'NGN', { compact: true })} MRR
                  </span>
                  {manage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        store.setPlanActive(p.id, !p.active);
                        notify(`${p.name} ${p.active ? 'archived' : 'reopened'}`);
                      }}
                    >
                      {p.active ? 'Archive' : 'Reopen'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Drawer open={Boolean(open)} onClose={() => setOpenId(null)} title="Subscription">
        {open && openPlan && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <Avatar name={customerOf(open.customerId)?.name ?? '?'} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold tracking-tight text-ink">{customerOf(open.customerId)?.name}</p>
                <p className="text-sm text-ink-3">{openPlan.name}</p>
              </div>
              <Pill tone={SUBSCRIPTION_STATUS[open.status].tone}>{SUBSCRIPTION_STATUS[open.status].label}</Pill>
            </div>
            <DetailList
              items={[
                { term: 'Price', detail: <span><Money amount={openPlan.amount} currency={openPlan.currency} /> / {INTERVAL_LABEL[openPlan.interval]}</span> },
                { term: 'Started', detail: formatDate(open.startedAt) },
                { term: 'Next charge', detail: open.nextBillingAt ? formatDate(open.nextBillingAt) : '—' },
                { term: 'Charges', detail: openCharges.filter((t) => t.status === 'successful').length },
                { term: 'Subscription ID', detail: <span className="font-mono text-[13px]">{open.id}</span> },
              ]}
            />
            {manage && open.status !== 'cancelled' && (
              <div className="mt-6 flex flex-wrap gap-2">
                {open.status === 'paused' ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      store.setSubscriptionStatus(open.id, 'active');
                      notify('Subscription resumed');
                    }}
                  >
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      store.setSubscriptionStatus(open.id, 'paused');
                      notify('Subscription paused');
                    }}
                  >
                    Pause
                  </Button>
                )}
                <Button variant="danger" onClick={() => setConfirmCancel(true)}>
                  Cancel subscription
                </Button>
              </div>
            )}
            <h3 className="mt-8 mb-2 text-sm font-semibold text-ink">Charges</h3>
            {openCharges.length === 0 ? (
              <p className="text-sm text-ink-3">No charges in the last 90 days.</p>
            ) : (
              <ul className="-mx-6 border-y border-line divide-y divide-line">
                {openCharges.map((t) => (
                  <TxnListItem key={t.id} txn={t} data={data} onOpen={onOpenTxn} />
                ))}
              </ul>
            )}
          </>
        )}
      </Drawer>

      {confirmCancel && open && (
        <Modal
          open
          onClose={() => setConfirmCancel(false)}
          title="Cancel this subscription?"
          description={`${customerOf(open.customerId)?.name} won’t be charged again. This can’t be undone — they’d need to subscribe again.`}
          footer={
            <>
              <Button onClick={() => setConfirmCancel(false)}>Keep it</Button>
              <Button
                variant="danger"
                onClick={() => {
                  store.setSubscriptionStatus(open.id, 'cancelled');
                  notify('Subscription cancelled');
                  setConfirmCancel(false);
                }}
              >
                Cancel subscription
              </Button>
            </>
          }
        >
          {null}
        </Modal>
      )}

      {creatingPlan && (
        <NewPlanModal
          onClose={() => setCreatingPlan(false)}
          onCreate={(p) => {
            store.createPlan(p);
            notify(`Plan “${p.name}” created`);
          }}
        />
      )}

      {adding && (
        <AddSubscriberModal
          data={data}
          onClose={() => setAdding(false)}
          onAdd={(customerId, planId) => {
            store.subscribeCustomer(customerId, planId);
            notify(`${customerOf(customerId)?.name} subscribed`);
          }}
        />
      )}
    </>
  );
}
