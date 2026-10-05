'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, UserPlus } from 'lucide-react';

import { DAY_MS, formatDate, formatMoney, formatRelative, toNgn } from '../../lib/console/format';
import type { Customer, Transaction } from '../../lib/console/types';
import { canMoveMoney, type PageProps } from './nav';
import { Avatar, Button, Card, DetailList, Drawer, EmptyState, Field, Modal, Money, PageHeader, controlClass, cx, inputClass } from './ui';
import { TxnListItem } from './txn';
import { useNow } from '../../lib/console/useNow';

interface CustomerRow {
  customer: Customer;
  payments: Transaction[];
  count: number;
  ngn: number;
  usdt: number;
  /** Both currencies in naira, for ranking. */
  total: number;
  lastPaidAt: number | null;
}

type SortKey = 'name' | 'count' | 'total' | 'lastPaidAt';

function AddCustomerModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Pick<Customer, 'name' | 'email' | 'phone'>) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const error = !name.trim() ? 'Enter their name.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Enter a valid email.' : null;
  return (
    <Modal
      open
      onClose={onClose}
      title="Add customer"
      description="Save someone you bill often — for invoices and subscriptions."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTouched(true);
              if (error) return;
              onAdd({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() });
              onClose();
            }}
          >
            Add customer
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Full name" htmlFor="cus-name">
          <input id="cus-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Amina Bello" className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="cus-email" error={touched && error ? error : undefined}>
          <input id="cus-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="amina@example.com" className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="cus-phone" hint="Optional">
          <input id="cus-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 803 000 0000" className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
}

export default function CustomersPage({ data, store, role, sub, notify, onNavigate, onOpenTxn }: PageProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'total', desc: true });
  const [adding, setAdding] = useState(false);
  // The open customer lives in the URL (#customers/cus_…) so search can deep-link to it.
  const openId = sub;
  const setOpenId = (id: string | null) => onNavigate('customers', id ?? undefined);
  const now = useNow();

  const rows = useMemo<CustomerRow[]>(() => {
    const byCustomer = new Map<string, Transaction[]>();
    for (const t of data.transactions) {
      if (t.kind !== 'payment' || !t.customerId) continue;
      const list = byCustomer.get(t.customerId) ?? [];
      list.push(t);
      byCustomer.set(t.customerId, list);
    }
    return data.customers.map((customer) => {
      const payments = byCustomer.get(customer.id) ?? [];
      const paid = payments.filter((t) => t.status === 'successful');
      const ngn = paid.filter((t) => t.currency === 'NGN').reduce((s, t) => s + t.amount, 0);
      const usdt = paid.filter((t) => t.currency === 'USDT').reduce((s, t) => s + t.amount, 0);
      return {
        customer,
        payments,
        count: paid.length,
        ngn,
        usdt,
        total: ngn + toNgn(usdt, 'USDT'),
        lastPaidAt: paid[0]?.createdAt ?? null,
      };
    });
  }, [data.transactions, data.customers]);

  const summary = useMemo(() => {
    const since = now - 30 * DAY_MS;
    const active = rows.filter((r) => r.lastPaidAt !== null && r.lastPaidAt >= since).length;
    const total = rows.reduce((s, r) => s + r.total, 0);
    return { count: rows.length, active, average: rows.length ? total / rows.length : 0 };
  }, [rows, now]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter((r) => r.customer.name.toLowerCase().includes(q) || r.customer.email.toLowerCase().includes(q))
      : rows.slice();
    const dir = sort.desc ? -1 : 1;
    list.sort((a, b) => {
      if (sort.key === 'name') return a.customer.name.localeCompare(b.customer.name) * dir;
      return ((a[sort.key] ?? 0) - (b[sort.key] ?? 0)) * dir;
    });
    return list;
  }, [rows, query, sort]);

  const open = openId ? rows.find((r) => r.customer.id === openId) ?? null : null;

  const sortHeader = (k: SortKey, children: React.ReactNode, align: 'left' | 'right' = 'left') => {
    const active = sort.key === k;
    return (
      <th key={k} className={cx('font-medium px-5 py-3', align === 'right' && 'text-right')} aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
        <button
          type="button"
          onClick={() => setSort((s) => ({ key: k, desc: s.key === k ? !s.desc : k !== 'name' }))}
          className={cx('inline-flex items-center gap-1 cursor-pointer hover:text-ink', active && 'text-ink')}
        >
          {children}
          {active && (sort.desc ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />)}
        </button>
      </th>
    );
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who has paid you, and how much."
        actions={
          canMoveMoney(role) && (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <UserPlus className="size-4" />
              Add customer
            </Button>
          )
        }
      />
      {adding && (
        <AddCustomerModal
          onClose={() => setAdding(false)}
          onAdd={(c) => {
            store.addCustomer(c);
            notify(`${c.name} added`);
          }}
        />
      )}

      <Card className="grid grid-cols-3 mb-6">
        {[
          { label: 'Customers', value: summary.count.toLocaleString() },
          { label: 'Paid in last 30 days', value: summary.active.toLocaleString() },
          { label: 'Average lifetime value', value: formatMoney(summary.average, 'NGN', { compact: true }) },
        ].map((s, i) => (
          <div key={s.label} className={cx('p-4 sm:p-5', i > 0 && 'border-l border-line')}>
            <p className="text-xs text-ink-3">{s.label}</p>
            <p className="mt-1.5 text-lg sm:text-xl font-semibold tabular-nums tracking-tight text-ink">{s.value}</p>
          </div>
        ))}
      </Card>

      <div className="relative mb-4 max-w-md">
        <Search aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search customers"
          className={cx(controlClass, 'h-10 !pl-10')}
        />
      </div>

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState title="No customers found" description="Check the spelling, or search by email." />
        ) : (
          <>
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-3 border-b border-line">
                  {sortHeader('name', 'Customer')}
                  {sortHeader('count', 'Payments', 'right')}
                  <th className="font-medium px-5 py-3 text-right">Paid in NGN</th>
                  <th className="font-medium px-5 py-3 text-right">Paid in USDT</th>
                  {sortHeader('total', 'Total (≈ NGN)', 'right')}
                  {sortHeader('lastPaidAt', 'Last paid', 'right')}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => (
                  <tr key={r.customer.id} onClick={() => setOpenId(r.customer.id)} className="hover:bg-subtle cursor-pointer transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.customer.name} />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenId(r.customer.id);
                            }}
                            className="block font-medium text-ink text-left hover:underline underline-offset-4 cursor-pointer"
                          >
                            {r.customer.name}
                          </button>
                          <span className="block text-xs text-ink-3 truncate">{r.customer.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-2">{r.count}</td>
                    <td className="px-5 py-3 text-right">
                      {r.ngn > 0 ? <Money amount={r.ngn} currency="NGN" className="text-ink-2" /> : <span className="text-ink-3">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.usdt > 0 ? <Money amount={r.usdt} currency="USDT" className="text-ink-2" /> : <span className="text-ink-3">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Money amount={r.total} currency="NGN" className="font-medium text-ink" />
                    </td>
                    <td className="px-5 py-3 text-right text-ink-2 whitespace-nowrap">{formatRelative(r.lastPaidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="md:hidden divide-y divide-line">
              {visible.map((r) => (
                <li key={r.customer.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(r.customer.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
                  >
                    <Avatar name={r.customer.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink truncate">{r.customer.name}</span>
                      <span className="block text-xs text-ink-3">
                        {r.count} payments · {formatRelative(r.lastPaidAt)}
                      </span>
                    </span>
                    <Money amount={r.total} currency="NGN" compact className="text-sm font-medium text-ink" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Drawer open={Boolean(open)} onClose={() => setOpenId(null)} title="Customer">
        {open && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <Avatar name={open.customer.name} size="lg" />
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight text-ink">{open.customer.name}</p>
                <p className="text-sm text-ink-3 truncate">{open.customer.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg border border-line p-4">
                <p className="text-xs text-ink-3">Total paid (≈ NGN)</p>
                <Money amount={open.total} currency="NGN" className="mt-1 block text-lg font-medium text-ink" />
              </div>
              <div className="rounded-lg border border-line p-4">
                <p className="text-xs text-ink-3">Successful payments</p>
                <p className="mt-1 text-lg font-medium tabular-nums text-ink">{open.count}</p>
              </div>
            </div>

            <DetailList
              items={[
                { term: 'Phone', detail: <span className="font-mono text-[13px]">{open.customer.phone}</span> },
                { term: 'Customer since', detail: formatDate(open.customer.joinedAt) },
                { term: 'Paid in NGN', detail: <Money amount={open.ngn} currency="NGN" /> },
                { term: 'Paid in USDT', detail: <Money amount={open.usdt} currency="USDT" /> },
                { term: 'Customer ID', detail: <span className="font-mono text-[13px]">{open.customer.id}</span> },
              ]}
            />

            <h3 className="mt-8 mb-2 text-sm font-semibold text-ink">Payments</h3>
            {open.payments.length === 0 ? (
              <p className="text-sm text-ink-3">No payments yet.</p>
            ) : (
              <ul className="-mx-6 border-y border-line divide-y divide-line">
                {open.payments.slice(0, 30).map((t) => (
                  <TxnListItem key={t.id} txn={t} data={data} onOpen={onOpenTxn} />
                ))}
              </ul>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
