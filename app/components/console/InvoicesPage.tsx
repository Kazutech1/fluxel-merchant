'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { invoiceTotal } from '../../lib/console/demoCatalog';
import { DAY_MS, formatDate, formatMoney } from '../../lib/console/format';
import { useNow } from '../../lib/console/useNow';
import type { Currency, Invoice, InvoiceItem } from '../../lib/console/types';
import { canMoveMoney, invoiceStatus, type PageProps } from './nav';
import {
  Button,
  Card,
  CopyField,
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
  textareaClass,
} from './ui';

type Filter = 'all' | 'draft' | 'open' | 'overdue' | 'paid';

function CreateInvoiceModal({
  data,
  onClose,
  onCreate,
}: {
  data: PageProps['data'];
  onClose: () => void;
  onCreate: (input: { customerId: string; currency: Currency; items: InvoiceItem[]; dueAt: number; note: string }, send: boolean) => void;
}) {
  const [customerId, setCustomerId] = useState(data.customers[0]?.id ?? '');
  const [currency, setCurrency] = useState<Currency>('NGN');
  const [items, setItems] = useState<{ description: string; quantity: string; unitPrice: string }[]>([
    { description: '', quantity: '1', unitPrice: '' },
  ]);
  const [dueDays, setDueDays] = useState('14');
  const [note, setNote] = useState('Thank you for your business.');
  const [touched, setTouched] = useState(false);

  const parsed = items.map((it) => ({
    description: it.description.trim(),
    quantity: Math.max(1, Math.floor(Number(it.quantity) || 0)),
    unitPrice: Number(it.unitPrice) || 0,
  }));
  const total = parsed.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const error = !customerId
    ? 'Choose a customer.'
    : parsed.some((it) => !it.description || it.unitPrice <= 0)
      ? 'Every line needs a description and a price.'
      : null;

  const setItem = (i: number, key: 'description' | 'quantity' | 'unitPrice', value: string) =>
    setItems((list) => list.map((it, j) => (j === i ? { ...it, [key]: value } : it)));

  const submit = (send: boolean) => {
    setTouched(true);
    if (error) return;
    onCreate({ customerId, currency, items: parsed, dueAt: Date.now() + Number(dueDays) * DAY_MS, note: note.trim() }, send);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      title="New invoice"
      description="We email the customer a link to pay by bank transfer or USDT."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => submit(false)}>Save draft</Button>
          <Button variant="primary" onClick={() => submit(true)}>
            Send invoice
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-4 items-end">
          <Field label="Customer" htmlFor="inv-customer">
            <select id="inv-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={selectClass}>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.email}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <p className="text-sm font-medium text-ink-2 mb-2">Currency</p>
            <Segmented<Currency>
              label="Currency"
              value={currency}
              onChange={setCurrency}
              options={[
                { value: 'NGN', label: 'NGN' },
                { value: 'USDT', label: 'USDT' },
              ]}
            />
          </div>
          <Field label="Due in" htmlFor="inv-due">
            <select id="inv-due" value={dueDays} onChange={(e) => setDueDays(e.target.value)} className={cx(selectClass, 'sm:w-32')}>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </Field>
        </div>

        <div>
          <div className="hidden sm:grid grid-cols-[1fr_5rem_9rem_2.5rem] gap-2 mb-2 text-sm font-medium text-ink-2">
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
            <span />
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_4.5rem] sm:grid-cols-[1fr_5rem_9rem_2.5rem] gap-2">
                <input
                  aria-label={`Item ${i + 1} description`}
                  value={it.description}
                  onChange={(e) => setItem(i, 'description', e.target.value)}
                  placeholder="Lace fabric (5 yards)"
                  className={cx(inputClass, 'col-span-2 sm:col-span-1')}
                />
                <input
                  aria-label={`Item ${i + 1} quantity`}
                  inputMode="numeric"
                  value={it.quantity}
                  onChange={(e) => setItem(i, 'quantity', e.target.value.replace(/\D/g, ''))}
                  className={cx(inputClass, 'font-mono')}
                />
                <input
                  aria-label={`Item ${i + 1} price`}
                  inputMode="decimal"
                  value={it.unitPrice}
                  onChange={(e) => setItem(i, 'unitPrice', e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="0.00"
                  className={cx(inputClass, 'font-mono')}
                />
                <button
                  type="button"
                  aria-label={`Remove item ${i + 1}`}
                  disabled={items.length === 1}
                  onClick={() => setItems((list) => list.filter((_, j) => j !== i))}
                  className="hidden sm:inline-flex size-11 items-center justify-center rounded-lg text-ink-3 hover:text-negative hover:bg-subtle disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Button size="sm" variant="ghost" onClick={() => setItems((l) => [...l, { description: '', quantity: '1', unitPrice: '' }])}>
              <Plus className="size-4" />
              Add item
            </Button>
            <p className="text-sm text-ink-2">
              Total <Money amount={total} currency={currency} className="ml-2 text-base font-semibold text-ink" />
            </p>
          </div>
          {touched && error && <p className="mt-2 text-xs text-negative">{error}</p>}
        </div>

        <Field label="Note to customer" htmlFor="inv-note">
          <textarea id="inv-note" value={note} onChange={(e) => setNote(e.target.value)} className={cx(textareaClass, 'min-h-20')} />
        </Field>
      </div>
    </Modal>
  );
}

function InvoicePreview({ inv, data }: { inv: Invoice; data: PageProps['data'] }) {
  const customer = data.customers.find((c) => c.id === inv.customerId);
  return (
    <div className="rounded-xl border border-line bg-surface p-5 text-sm shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-ink">{data.business.tradingName}</p>
          <p className="text-xs text-ink-3">{data.business.address}</p>
        </div>
        <p className="font-mono text-xs text-ink-3">{inv.number}</p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-ink-3">Billed to</p>
          <p className="mt-0.5 text-ink">{customer?.name}</p>
          <p className="text-ink-3">{customer?.email}</p>
        </div>
        <div className="text-right">
          <p className="text-ink-3">Due</p>
          <p className="mt-0.5 text-ink">{formatDate(inv.dueAt)}</p>
        </div>
      </div>
      <table className="mt-5 w-full text-xs">
        <thead>
          <tr className="text-ink-3 border-b border-line">
            <th className="text-left font-medium py-2">Item</th>
            <th className="text-right font-medium py-2">Qty</th>
            <th className="text-right font-medium py-2">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {inv.items.map((it, i) => (
            <tr key={i}>
              <td className="py-2 text-ink">{it.description}</td>
              <td className="py-2 text-right text-ink-2 tabular-nums">{it.quantity}</td>
              <td className="py-2 text-right text-ink">
                <Money amount={it.quantity * it.unitPrice} currency={inv.currency} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 pt-3 border-t border-line flex justify-between items-baseline">
        <span className="text-ink-2">Total</span>
        <Money amount={invoiceTotal(inv)} currency={inv.currency} className="text-base font-semibold text-ink" />
      </div>
      {inv.note && <p className="mt-4 text-xs text-ink-3">{inv.note}</p>}
    </div>
  );
}

export default function InvoicesPage({ data, store, role, sub, notify, onNavigate, onOpenTxn }: PageProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const now = useNow();
  const manage = canMoveMoney(role);

  const counts = useMemo(() => {
    const c = { draft: 0, open: 0, overdue: 0, paid: 0, outstanding: 0, overdueAmount: 0, paid30: 0 };
    for (const inv of data.invoices) {
      const total = invoiceTotal(inv);
      if (inv.status === 'draft') c.draft++;
      if (inv.status === 'paid') {
        c.paid++;
        if ((inv.paidAt ?? 0) >= now - 30 * DAY_MS) c.paid30 += total;
      }
      if (inv.status === 'sent') {
        c.outstanding += total;
        if (inv.dueAt < now) {
          c.overdue++;
          c.overdueAmount += total;
        } else c.open++;
      }
    }
    return c;
  }, [data.invoices, now]);

  const visible = data.invoices.filter((inv) => {
    if (filter === 'all') return true;
    if (filter === 'draft') return inv.status === 'draft';
    if (filter === 'paid') return inv.status === 'paid';
    if (filter === 'overdue') return inv.status === 'sent' && inv.dueAt < now;
    return inv.status === 'sent' && inv.dueAt >= now;
  });

  const open = sub ? data.invoices.find((i) => i.id === sub) ?? null : null;
  const customerName = (id: string) => data.customers.find((c) => c.id === id)?.name ?? 'Customer';

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Bill customers and get paid by bank transfer or USDT."
        actions={
          manage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              New invoice
            </Button>
          )
        }
      />

      <StatStrip
        items={[
          { label: 'Outstanding', value: formatMoney(counts.outstanding, 'NGN', { compact: true }), hint: `${counts.open + counts.overdue} invoices` },
          { label: 'Overdue', value: formatMoney(counts.overdueAmount, 'NGN', { compact: true }), hint: `${counts.overdue} invoices` },
          { label: 'Paid · 30 days', value: formatMoney(counts.paid30, 'NGN', { compact: true }) },
        ]}
      />

      <Tabs<Filter>
        label="Invoice status"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'draft', label: 'Drafts', count: counts.draft },
          { value: 'open', label: 'Awaiting payment', count: counts.open },
          { value: 'overdue', label: 'Overdue', count: counts.overdue },
          { value: 'paid', label: 'Paid' },
        ]}
      />

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState title="Nothing here" description="Invoices you create will show up in this list." />
        ) : (
          <table className="w-full text-sm">
            <thead className="hidden md:table-header-group">
              <tr className="text-left text-xs text-ink-3 border-b border-line">
                <th className="font-medium px-5 py-3">Invoice</th>
                <th className="font-medium px-5 py-3">Customer</th>
                <th className="font-medium px-5 py-3">Status</th>
                <th className="font-medium px-5 py-3">Due</th>
                <th className="font-medium px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((inv) => {
                const st = invoiceStatus(inv, now);
                return (
                  <tr key={inv.id} onClick={() => onNavigate('invoices', inv.id)} className="hover:bg-subtle cursor-pointer transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-[13px] text-ink">{inv.number}</span>
                      <span className="md:hidden block text-xs text-ink-3">{customerName(inv.customerId)}</span>
                    </td>
                    <td className="hidden md:table-cell px-5 py-3 text-ink">{customerName(inv.customerId)}</td>
                    <td className="px-5 py-3">
                      <Pill tone={st.tone}>{st.label}</Pill>
                    </td>
                    <td className="hidden md:table-cell px-5 py-3 text-ink-2">{formatDate(inv.dueAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Money amount={invoiceTotal(inv)} currency={inv.currency} className="text-ink" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Drawer open={Boolean(open)} onClose={() => onNavigate('invoices')} title={open ? open.number : 'Invoice'}>
        {open && (
          <>
            <div className="flex items-center justify-between mb-4">
              <Pill tone={invoiceStatus(open, now).tone}>{invoiceStatus(open, now).label}</Pill>
              <span className="text-xs text-ink-3">Issued {formatDate(open.issuedAt)}</span>
            </div>
            <InvoicePreview inv={open} data={data} />

            {open.status !== 'draft' && open.status !== 'void' && (
              <div className="mt-5">
                <p className="text-sm font-medium text-ink-2 mb-2">Payment page</p>
                <CopyField value={`https://pay.fluxel.app/invoice/${open.number.toLowerCase()}`} />
              </div>
            )}

            {manage && (
              <div className="mt-6 flex flex-wrap gap-2">
                {open.status === 'draft' && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      store.sendInvoice(open.id);
                      notify(`${open.number} sent to ${customerName(open.customerId)}`);
                    }}
                  >
                    Send invoice
                  </Button>
                )}
                {open.status === 'sent' && (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => {
                        store.payInvoice(open.id);
                        notify(`Simulating ${customerName(open.customerId)} paying ${open.number}…`);
                      }}
                      title="Demo: pretend the customer paid"
                    >
                      Simulate payment
                    </Button>
                    <Button
                      onClick={() => {
                        store.remindInvoice(open.id);
                        notify(`Reminder sent for ${open.number}`);
                      }}
                    >
                      Send reminder
                    </Button>
                  </>
                )}
                {(open.status === 'draft' || open.status === 'sent') && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      store.voidInvoice(open.id);
                      notify(`${open.number} voided`);
                    }}
                  >
                    Void
                  </Button>
                )}
                {open.status === 'paid' && open.txnId && (
                  <Button onClick={() => onOpenTxn(open.txnId!)}>View payment</Button>
                )}
              </div>
            )}
          </>
        )}
      </Drawer>

      {creating && (
        <CreateInvoiceModal
          data={data}
          onClose={() => setCreating(false)}
          onCreate={(input, send) => {
            const inv = store.createInvoice(input, send);
            notify(send ? `${inv.number} sent` : `${inv.number} saved as draft`);
            onNavigate('invoices', inv.id);
          }}
        />
      )}
    </>
  );
}
