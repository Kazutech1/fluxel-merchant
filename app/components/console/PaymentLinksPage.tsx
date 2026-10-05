'use client';

import React, { useMemo, useState } from 'react';
import { ExternalLink, Plus } from 'lucide-react';

import QrCode from '../checkout/QrCode';
import { DAY_MS, formatDate, formatMoney, toNgn } from '../../lib/console/format';
import { useNow } from '../../lib/console/useNow';
import type { Currency, PaymentLink } from '../../lib/console/types';
import { canManage, type PageProps } from './nav';
import {
  Button,
  Card,
  CopyButton,
  CopyField,
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
  Switch,
  cx,
  inputClass,
  textareaClass,
} from './ui';
import { TxnListItem } from './txn';

export const linkUrl = (l: PaymentLink) => `https://pay.fluxel.app/${l.slug}`;

function CreateLinkModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: Pick<PaymentLink, 'title' | 'description' | 'amount' | 'currency'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<Currency>('NGN');
  const [pricing, setPricing] = useState<'fixed' | 'open'>('fixed');
  const [amount, setAmount] = useState('');
  const [touched, setTouched] = useState(false);

  const value = Number(amount) || 0;
  const error = !title.trim()
    ? 'Give the link a name.'
    : pricing === 'fixed' && value < (currency === 'NGN' ? 100 : 1)
      ? `Enter a price of at least ${formatMoney(currency === 'NGN' ? 100 : 1, currency)}.`
      : null;

  const submit = () => {
    setTouched(true);
    if (error) return;
    onCreate({ title: title.trim(), description: description.trim(), currency, amount: pricing === 'fixed' ? value : null });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New payment link"
      description="A page you can share anywhere — WhatsApp, Instagram, email — to get paid."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            Create link
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Name" htmlFor="link-title" error={touched && !title.trim() ? error ?? undefined : undefined}>
          <input id="link-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ankara fabric bundle" className={inputClass} />
        </Field>
        <Field label="Description" htmlFor="link-desc" hint="Optional — shown to the customer above the payment form.">
          <textarea
            id="link-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are they paying for?"
            className={cx(textareaClass, 'min-h-20')}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
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
          <div>
            <p className="text-sm font-medium text-ink-2 mb-2">Price</p>
            <Segmented
              label="Pricing"
              value={pricing}
              onChange={setPricing}
              className="w-full"
              options={[
                { value: 'fixed', label: 'Fixed' },
                { value: 'open', label: 'Customer decides' },
              ]}
            />
          </div>
        </div>
        {pricing === 'fixed' && (
          <Field label="Amount" htmlFor="link-amount" error={touched && title.trim() && error ? error : undefined}>
            <div className="relative">
              <input
                id="link-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0.00"
                className={cx(inputClass, '!pr-16 font-mono')}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3">{currency}</span>
            </div>
          </Field>
        )}
      </div>
    </Modal>
  );
}

export default function PaymentLinksPage({ data, store, role, sub, notify, onNavigate, onOpenTxn }: PageProps) {
  const [creating, setCreating] = useState(false);
  const now = useNow();
  const manage = canManage(role) || role === 'finance';
  const openId = sub;

  const stats = useMemo(() => {
    const per = new Map<string, { count: number; total: number }>();
    const since = now - 30 * DAY_MS;
    let count30 = 0;
    let total30 = 0;
    for (const t of data.transactions) {
      if (!t.linkId || t.status !== 'successful') continue;
      const s = per.get(t.linkId) ?? { count: 0, total: 0 };
      s.count++;
      s.total += t.amount;
      per.set(t.linkId, s);
      if (t.createdAt >= since) {
        count30++;
        total30 += toNgn(t.amount, t.currency);
      }
    }
    return { per, count30, total30 };
  }, [data.transactions, now]);

  const open = openId ? data.links.find((l) => l.id === openId) ?? null : null;
  const openPayments = open ? data.transactions.filter((t) => t.linkId === open.id).slice(0, 20) : [];

  return (
    <>
      <PageHeader
        title="Payment links"
        description="Shareable pages that collect payments — no website needed."
        actions={
          manage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              New link
            </Button>
          )
        }
      />

      <StatStrip
        items={[
          { label: 'Active links', value: data.links.filter((l) => l.active).length },
          { label: 'Collected via links · 30 days', value: formatMoney(stats.total30, 'NGN', { compact: true }), hint: 'USDT counted in naira' },
          { label: 'Payments via links · 30 days', value: stats.count30.toLocaleString() },
        ]}
      />

      <Card className="overflow-hidden">
        {data.links.length === 0 ? (
          <EmptyState title="No payment links yet" description="Create one to start collecting." />
        ) : (
          <ul className="divide-y divide-line">
            {data.links.map((l) => {
              const s = stats.per.get(l.id) ?? { count: 0, total: 0 };
              return (
                <li key={l.id} className="flex items-center gap-4 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => onNavigate('links', l.id)}
                    className="min-w-0 flex-1 text-left cursor-pointer group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink truncate group-hover:underline underline-offset-4">{l.title}</span>
                      {!l.active && <Pill tone="neutral">Off</Pill>}
                    </span>
                    <span className="block text-xs text-ink-3 font-mono truncate">pay.fluxel.app/{l.slug}</span>
                  </button>
                  <div className="hidden md:block w-36 text-right">
                    {l.amount === null ? (
                      <span className="text-sm text-ink-2">Customer decides</span>
                    ) : (
                      <Money amount={l.amount} currency={l.currency} className="text-sm text-ink" />
                    )}
                    <span className="block text-xs text-ink-3">{l.currency}</span>
                  </div>
                  <div className="hidden sm:block w-36 text-right">
                    <Money amount={s.total} currency={l.currency} compact className="text-sm text-ink" />
                    <span className="block text-xs text-ink-3">{s.count} payments</span>
                  </div>
                  <CopyButton value={linkUrl(l)} label="Copy link" />
                  {manage && (
                    <Switch
                      checked={l.active}
                      label={`${l.title} accepting payments`}
                      onChange={(on) => {
                        store.setLinkActive(l.id, on);
                        notify(`${l.title} ${on ? 'is live' : 'turned off'}`);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Drawer open={Boolean(open)} onClose={() => onNavigate('links')} title="Payment link">
        {open && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight text-ink">{open.title}</p>
                {open.description && <p className="mt-1 text-sm text-ink-2">{open.description}</p>}
              </div>
              <Pill tone={open.active ? 'positive' : 'neutral'}>{open.active ? 'Live' : 'Off'}</Pill>
            </div>

            <div className="mt-6">
              <CopyField value={linkUrl(open)} />
            </div>

            <div className="mt-6 flex items-center gap-5">
              <QrCode value={linkUrl(open)} className="size-32 border border-line" />
              <p className="text-sm text-ink-2">
                Print this on receipts or packaging — customers scan it to pay.
              </p>
            </div>

            <div className="mt-6">
              <DetailList
                items={[
                  { term: 'Price', detail: open.amount === null ? 'Customer decides' : <Money amount={open.amount} currency={open.currency} /> },
                  { term: 'Collected', detail: <Money amount={stats.per.get(open.id)?.total ?? 0} currency={open.currency} /> },
                  { term: 'Payments', detail: stats.per.get(open.id)?.count ?? 0 },
                  { term: 'Created', detail: formatDate(open.createdAt) },
                ]}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => window.open(linkUrl(open), '_blank', 'noopener')} title="Opens the hosted page (not live in the demo)">
                <ExternalLink className="size-4" />
                Open page
              </Button>
              {manage && (
                <Button
                  onClick={() => {
                    store.setLinkActive(open.id, !open.active);
                    notify(`${open.title} ${open.active ? 'turned off' : 'is live'}`);
                  }}
                >
                  {open.active ? 'Turn off' : 'Turn on'}
                </Button>
              )}
            </div>

            <h3 className="mt-8 mb-2 text-sm font-semibold text-ink">Recent payments</h3>
            {openPayments.length === 0 ? (
              <p className="text-sm text-ink-3">No payments yet — share the link to get started.</p>
            ) : (
              <ul className="-mx-6 border-y border-line divide-y divide-line">
                {openPayments.map((t) => (
                  <TxnListItem key={t.id} txn={t} data={data} onOpen={onOpenTxn} />
                ))}
              </ul>
            )}
          </>
        )}
      </Drawer>

      {creating && (
        <CreateLinkModal
          onClose={() => setCreating(false)}
          onCreate={(input) => {
            const link = store.createLink(input);
            notify(`Link created — ${link.title}`);
            onNavigate('links', link.id);
          }}
        />
      )}
    </>
  );
}
