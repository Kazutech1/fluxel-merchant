'use client';

import React, { useMemo, useState } from 'react';
import { HandCoins, Lock, Search, Unlock, UserPlus } from 'lucide-react';

import { checkoutUrl } from '../../lib/console/checkoutLink';
import { dash, invalidate, v1 } from '../../lib/console/client';
import {
  useAssets,
  useCustomerAddresses,
  useCustomerBalances,
  useCustomers,
  useTransactions,
} from '../../lib/console/data';
import { formatRelative, titleCase } from '../../lib/console/format';
import { CHAIN_LABEL } from '../../lib/console/money';
import type { Balance, Customer, DepositIntent } from '../../lib/console/models';
import { decimalsFor, toMajor, toMinor } from '../../lib/console/money';
import { can } from '../../lib/permissions';
import CurrencyIcon from './CurrencyIcon';
import type { PageProps } from './nav';
import {
  AsyncButton,
  Avatar,
  Button,
  Card,
  CopyField,
  DetailList,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  LoadingRows,
  Modal,
  Money,
  PageHeader,
  Segmented,
  Skeleton,
  StatusBadge,
  controlClass,
  cx,
  inputClass,
} from './ui';
import { TxnListItem } from './txn';
import { AmountField, CurrencyPicker, PAY_CURRENCIES, RequestReady, createCryptoRequest, type CreatedRequest, type PayCurrency } from './PaymentRequest';

function AddCustomerModal({ onClose, onCreated, notify }: { onClose: () => void; onCreated: (id: string) => void; notify: PageProps['notify'] }) {
  const [externalId, setExternalId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a customer"
      description="Each customer gets their own deposit addresses and balances inside your Fluxel account."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <AsyncButton
            variant="primary"
            disabled={!externalId.trim()}
            onClick={async () => {
              setError(null);
              try {
                const created = await v1.post<{ id: string }>('customers', {
                  external_id: externalId.trim(),
                  name: name.trim() || undefined,
                  email: email.trim() || undefined,
                });
                invalidate(`customers`);
                notify(`Customer ${externalId.trim()} added — their wallets are being set up`);
                onCreated(created.id);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not add the customer.');
              }
            }}
          >
            Add customer
          </AsyncButton>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Customer reference" htmlFor="cus-ref" hint="Your own ID for them — an account number, username or email. This is what the dashboard shows.">
          <input id="cus-ref" value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="user_1042 or ada@example.com" className={inputClass} autoComplete="off" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Name" htmlFor="cus-name" hint="Optional">
            <input id="cus-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Email" htmlFor="cus-email" hint="Optional">
            <input id="cus-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
        </div>
        {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      </div>
    </Modal>
  );
}

/** Asks one customer to pay — naira (one-time account) or crypto (one-time address) — and hands back a checkout link. */
function RequestPaymentModal({
  customer,
  merchant,
  onClose,
  notify,
}: {
  customer: Customer;
  merchant: string;
  onClose: () => void;
  notify: PageProps['notify'];
}) {
  const { data: assets } = useAssets();
  const [currency, setCurrency] = useState<PayCurrency>('NGN');
  const [mode, setMode] = useState<'fixed' | 'open'>('fixed');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<CreatedRequest | null>(null);
  const minor = toMinor(amount, decimalsFor(PAY_CURRENCIES[currency].asset, assets));
  const openAmount = currency === 'NGN' && mode === 'open';
  const context = { merchant, customer_name: customer.external_id };

  const create = async () => {
    setError(null);
    try {
      if (currency === 'NGN') {
        const intent = await v1.post<DepositIntent>(`customers/${customer.id}/fiat-deposit-intents`, {
          amount_mode: mode,
          amount: mode === 'fixed' ? minor : undefined,
        });
        const { publishableKey } = await dash.get<{ publishableKey: string }>('console?publishable=1');
        setReady({ intentId: intent.id, url: checkoutUrl(intent.id, { pk: publishableKey, ...context }), currency, expiresAt: intent.expires_at });
      } else {
        setReady(await createCryptoRequest(customer.id, currency, minor!, context));
      }
      notify('Payment request created');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the payment request.');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={ready ? 'Payment link ready' : `Request a payment from ${customer.external_id}`}
      description={ready ? undefined : 'Creates a one-time way for this customer to pay you.'}
      footer={
        ready ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <AsyncButton variant="primary" disabled={!openAmount && !minor} onClick={create}>
              Create link
            </AsyncButton>
          </>
        )
      }
    >
      {ready ? (
        <RequestReady request={ready} />
      ) : (
        <div className="space-y-5">
          <CurrencyPicker
            value={currency}
            onChange={(c) => {
              setCurrency(c);
              setAmount('');
              if (c !== 'NGN') setMode('fixed');
            }}
          />
          {currency === 'NGN' && (
            <Segmented
              label="Amount"
              value={mode}
              onChange={setMode}
              className="w-full"
              options={[
                { value: 'fixed', label: 'Fixed amount' },
                { value: 'open', label: 'Customer decides' },
              ]}
            />
          )}
          {!openAmount && <AmountField id="req-amount" currency={currency} value={amount} onChange={setAmount} assets={assets} />}
          {error && <p role="alert" className="text-sm text-negative">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

/** Naira, USDT, Bitcoin and Ether always (zero if empty), then anything else the customer holds. */
function balanceTiles(balances: Balance[]): { asset: string; label: string; available: string }[] {
  const find = (codes: string[]) => balances.find((b) => codes.includes(b.asset_code))?.available ?? '0';
  const main = [
    { asset: 'NGN', label: 'Naira', codes: ['NGN'] },
    { asset: 'USDT-TRON', label: 'USDT', codes: ['USDT-TRON', 'USDT'] },
    { asset: 'BTC', label: 'Bitcoin', codes: ['BTC'] },
    { asset: 'ETH', label: 'Ether', codes: ['ETH'] },
  ];
  const shown = new Set(main.flatMap((m) => m.codes));
  return [
    ...main.map((m) => ({ asset: m.asset, label: m.label, available: find(m.codes) })),
    ...balances
      .filter((b) => !shown.has(b.asset_code) && Number(b.available) > 0)
      .map((b) => ({ asset: b.asset_code, label: b.asset_code, available: b.available })),
  ];
}

function CustomerDrawer({ customer, props }: { customer: Customer; props: PageProps }) {
  const { role, notify, onOpenTxn, business } = props;
  const { data: assets } = useAssets();
  const balances = useCustomerBalances(customer.id);
  const addresses = useCustomerAddresses(customer.id);
  const txns = useTransactions();
  const [requesting, setRequesting] = useState(false);
  const theirs = (txns.data ?? []).filter((t) => t.customer_id === customer.id || t.to_customer_id === customer.id);
  const frozen = customer.status === 'frozen';

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Avatar name={customer.external_id} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tracking-tight text-ink truncate">{customer.external_id}</p>
          <StatusBadge status={customer.status} />
        </div>
      </div>

      {can(role, 'customers.write') && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Button variant="primary" size="sm" disabled={frozen} onClick={() => setRequesting(true)}>
            <HandCoins className="size-4" />
            Request payment
          </Button>
          <AsyncButton
            size="sm"
            variant={frozen ? 'secondary' : 'danger'}
            onClick={async () => {
              try {
                await v1.post(`customers/${customer.id}/${frozen ? 'unfreeze' : 'freeze'}`);
                invalidate(`customers`);
                notify(frozen ? `${customer.external_id} unfrozen` : `${customer.external_id} frozen — they can’t move money until you unfreeze them`);
              } catch (e) {
                notify(e instanceof Error ? e.message : 'Could not update the customer', 'error');
              }
            }}
          >
            {frozen ? <Unlock className="size-4" /> : <Lock className="size-4" />}
            {frozen ? 'Unfreeze' : 'Freeze'}
          </AsyncButton>
        </div>
      )}


      <DetailList items={[{ term: 'Customer ID', detail: <span className="font-mono text-[13px] break-all">{customer.id}</span> }]} />

      <h3 className="mt-8 mb-3 text-sm font-semibold text-ink">Balances</h3>
      {balances.error ? (
        <p className="text-sm text-negative">{balances.error.message}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {balanceTiles(balances.data ?? []).map((t) => (
            <div key={t.asset} className="rounded-xl border border-line p-3.5">
              <div className="flex items-center gap-2">
                <CurrencyIcon asset={t.asset} className="size-6" />
                <span className="text-xs text-ink-3">{t.label}</span>
              </div>
              {balances.loading ? (
                <Skeleton className="mt-2.5 h-5 w-20" />
              ) : (
                <Money
                  minor={t.available}
                  asset={t.asset}
                  assets={assets}
                  className={cx('mt-2 block text-base font-semibold', Number(t.available) > 0 ? 'text-ink' : 'text-ink-3')}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <h3 className="mt-8 mb-1 text-sm font-semibold text-ink">Crypto deposit addresses</h3>
      <p className="mb-3 text-xs text-ink-3">Anything this customer sends to these lands in their balance.</p>
      {addresses.loading ? (
        <p className="text-sm text-ink-3">Loading…</p>
      ) : (addresses.data ?? []).length === 0 ? (
        <p className="text-sm text-ink-3">Their wallets are still being set up — check back in a minute.</p>
      ) : (
        <div className="space-y-3">
          {addresses.data!.map((a) => (
            <Field key={a.chain} label={CHAIN_LABEL[a.chain] ?? titleCase(a.chain)}>
              <CopyField value={a.address} />
            </Field>
          ))}
        </div>
      )}

      <h3 className="mt-8 mb-2 text-sm font-semibold text-ink">Transactions</h3>
      {theirs.length === 0 ? (
        <p className="text-sm text-ink-3">No transactions for this customer yet.</p>
      ) : (
        <ul className="-mx-6 border-y border-line divide-y divide-line">
          {theirs.slice(0, 30).map((t) => (
            <TxnListItem key={`${t.direction}:${t.id}`} txn={t} assets={assets} onOpen={onOpenTxn} customers={[customer]} />
          ))}
        </ul>
      )}

      {requesting && <RequestPaymentModal customer={customer} merchant={business.name} onClose={() => setRequesting(false)} notify={notify} />}
    </>
  );
}

export default function CustomersPage(props: PageProps) {
  const { role, sub, notify, onNavigate } = props;
  const customers = useCustomers();
  const txns = useTransactions();
  const { data: assets } = useAssets();
  const [query, setQuery] = useState('');

  const adding = sub === 'new';
  const open = sub && sub !== 'new' ? customers.data?.find((c) => c.id === sub) ?? null : null;

  // Naira received per customer, from the transactions we have.
  const stats = useMemo(() => {
    const m = new Map<string, { count: number; ngn: number; last: number }>();
    const d = decimalsFor('NGN', assets);
    for (const t of txns.data ?? []) {
      if (t.direction !== 'in' || !t.customer_id || t.status === 'failed') continue;
      const s = m.get(t.customer_id) ?? { count: 0, ngn: 0, last: 0 };
      s.count++;
      if (t.asset_code === 'NGN') s.ngn += toMajor(t.amount, d);
      s.last = Math.max(s.last, Date.parse(t.created_at ?? '0'));
      m.set(t.customer_id, s);
    }
    return m;
  }, [txns.data, assets]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (customers.data ?? []).filter((c) => !q || c.external_id.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [customers.data, query]);

  return (
    <>
      <PageHeader
        title="Customers"
        description="The people who pay you. Each has their own deposit addresses and balances."
        actions={
          can(role, 'customers.write') && (
            <Button variant="primary" onClick={() => onNavigate('customers', 'new')}>
              <UserPlus className="size-4" />
              Add customer
            </Button>
          )
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by reference or ID"
          aria-label="Search customers"
          className={cx(controlClass, 'h-10 !pl-10')}
        />
      </div>

      <Card className="overflow-hidden">
        {customers.loading ? (
          <LoadingRows rows={6} />
        ) : customers.error ? (
          <ErrorState message={customers.error.message} onRetry={customers.reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            title={query ? 'No customers found' : 'No customers yet'}
            description={query ? 'Check the spelling, or search by customer ID.' : 'Add your first customer to start collecting payments.'}
          />
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((c) => {
              const s = stats.get(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('customers', c.id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-subtle cursor-pointer transition-colors"
                  >
                    <Avatar name={c.external_id} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink truncate">{c.external_id}</span>
                      <span className="block text-xs text-ink-3 font-mono truncate">{c.id}</span>
                    </span>
                    <span className="hidden sm:block w-40 text-right text-xs text-ink-3">
                      {s ? `${s.count} ${s.count === 1 ? 'deposit' : 'deposits'} · ${formatRelative(s.last)}` : 'No deposits yet'}
                    </span>
                    <span className="hidden md:block w-32 text-right">
                      {s && s.ngn > 0 ? <Money value={s.ngn} asset="NGN" className="text-sm text-ink" /> : <span className="text-sm text-ink-3">—</span>}
                    </span>
                    <span className="w-20 text-right">
                      <StatusBadge status={c.status} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Drawer open={Boolean(open)} onClose={() => onNavigate('customers')} title="Customer">
        {open && <CustomerDrawer customer={open} props={props} />}
      </Drawer>

      {adding && (
        <AddCustomerModal notify={notify} onClose={() => onNavigate('customers')} onCreated={(id) => onNavigate('customers', id)} />
      )}
    </>
  );
}
