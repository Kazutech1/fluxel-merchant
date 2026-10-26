'use client';

import React, { useState } from 'react';
import { Ban, ExternalLink, KeyRound, Plus } from 'lucide-react';

import QrCode from '../checkout/QrCode';
import { checkoutUrl } from '../../lib/console/checkoutLink';
import { dash, invalidate, v1 } from '../../lib/console/client';
import { useAssets, useCustomers, usePaymentLinks, usePublishableKey } from '../../lib/console/data';
import { decimalsFor, toMinor } from '../../lib/console/money';
import type { PaymentLink } from '../../lib/console/models';
import { can } from '../../lib/permissions';
import type { PageProps } from './nav';
import {
  AsyncButton,
  Button,
  Card,
  CopyButton,
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
  Pill,
  cx,
  inputClass,
  selectClass,
  textareaClass,
} from './ui';
import { customerLabel } from './txn';
import { AmountField, CurrencyPicker, PAY_CURRENCIES, RequestReady, createCryptoRequest, type CreatedRequest, type PayCurrency } from './PaymentRequest';

/**
 * Shown when the dashboard can't mint a checkout key because the account is at
 * its two-key limit: paste a sandbox publishable key you already have, and the
 * server checks it belongs to this account before using it.
 */
function CheckoutKeyNeeded({ message, onNavigate }: { message: string; onNavigate: PageProps['onNavigate'] }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-brand/50 bg-gold-soft p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <KeyRound className="size-4 text-gold" />
        Links can’t be shared yet
      </p>
      <p className="mt-1 text-sm text-ink-2">{message}</p>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="pk_test_…"
          aria-label="Sandbox publishable key"
          autoComplete="off"
          spellCheck={false}
          className={cx(inputClass, 'font-mono text-[13px] sm:flex-1')}
        />
        <AsyncButton
          variant="primary"
          disabled={!key.trim()}
          onClick={async () => {
            setError(null);
            try {
              await dash.post('console', { publishableKey: key.trim() });
              invalidate('console');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not use that key.');
            }
          }}
        >
          Use this key
        </AsyncButton>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-negative">{error}</p>}
      <p className="mt-3 text-xs text-ink-3">
        Don’t have one saved?{' '}
        <button type="button" onClick={() => onNavigate('developers')} className="underline underline-offset-2 hover:text-ink cursor-pointer">
          Revoke a sandbox publishable key
        </button>{' '}
        and the dashboard makes a new one — but links already shared with the revoked key stop working.
      </p>
    </div>
  );
}

function CreateLinkModal({ props, onClose }: { props: PageProps; onClose: (createdId?: string) => void }) {
  const { notify, business } = props;
  const customers = useCustomers();
  const { data: assets } = useAssets();
  const active = (customers.data ?? []).filter((c) => c.status === 'active');
  const [currency, setCurrency] = useState<PayCurrency>('NGN');
  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [redirect, setRedirect] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<CreatedRequest | null>(null);
  const minor = toMinor(amount, decimalsFor(PAY_CURRENCIES[currency].asset, assets));
  const chosen = customerId || active[0]?.id || '';
  const badRedirect = redirect.trim() !== '' && !/^https:\/\//.test(redirect.trim());

  const create = async () => {
    setError(null);
    try {
      if (currency === 'NGN') {
        const link = await v1.post<PaymentLink>('payment-links', {
          customer_id: chosen,
          amount: minor,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          redirect_url: redirect.trim() || undefined,
        });
        invalidate('links');
        notify('Payment link created');
        onClose(link.id);
        return;
      }
      // Crypto: the API has no crypto payment links yet, so this is a crypto
      // deposit intent with the title and redirect carried in the checkout link.
      const request = await createCryptoRequest(chosen, currency, minor!, {
        merchant: business.name,
        customer_name: customerLabel(chosen, customers.data),
        order_ref: title.trim() || undefined,
        return_url: redirect.trim() || undefined,
      });
      notify(`${PAY_CURRENCIES[currency].label} payment link created`);
      setReady(request);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the link.');
    }
  };

  if (ready) {
    return (
      <Modal
        open
        onClose={() => onClose()}
        title={`${PAY_CURRENCIES[ready.currency].label} payment link ready`}
        description={`Your customer pays to a one-time address on ${PAY_CURRENCIES[ready.currency].network}.`}
        footer={
          <Button variant="primary" onClick={() => onClose()}>
            Done
          </Button>
        }
      >
        <RequestReady request={ready} />
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={() => onClose()}
      title="New payment link"
      description="A link your customer opens to pay you. Each link is for one customer and one amount."
      footer={
        <>
          <Button onClick={() => onClose()}>Cancel</Button>
          <AsyncButton variant="primary" disabled={!chosen || !minor || badRedirect} onClick={create}>
            Create link
          </AsyncButton>
        </>
      }
    >
      {customers.loading ? (
        <p className="text-sm text-ink-3">Loading customers…</p>
      ) : active.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-5 text-center">
          <p className="text-sm text-ink">Add a customer first</p>
          <p className="mt-1 text-sm text-ink-3">Payment links are made for a specific customer.</p>
          <Button size="sm" className="mt-3" onClick={() => props.onNavigate('customers', 'new')}>
            Add customer
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <CurrencyPicker
            value={currency}
            onChange={(c) => {
              setCurrency(c);
              setAmount('');
            }}
          />
          <Field label="Customer" htmlFor="link-customer">
            <select id="link-customer" value={chosen} onChange={(e) => setCustomerId(e.target.value)} className={selectClass}>
              {active.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.external_id}
                </option>
              ))}
            </select>
          </Field>
          <AmountField id="link-amount" currency={currency} value={amount} onChange={setAmount} assets={assets} />
          <Field label="Title" htmlFor="link-title" hint="Optional — shown to the customer.">
            <input id="link-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ankara fabric bundle" className={inputClass} />
          </Field>
          {currency === 'NGN' && (
            <Field label="Description" htmlFor="link-desc" hint="Optional">
              <textarea id="link-desc" value={description} onChange={(e) => setDescription(e.target.value)} className={cx(textareaClass, 'min-h-20')} />
            </Field>
          )}
          <Field label="After paying, send them to" htmlFor="link-redirect" hint="Optional — an https:// address." error={badRedirect ? 'Use an https:// address.' : undefined}>
            <input id="link-redirect" value={redirect} onChange={(e) => setRedirect(e.target.value)} placeholder="https://yourstore.com/thanks" className={inputClass} />
          </Field>
          {error && <p role="alert" className="text-sm text-negative">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

export default function PaymentLinksPage(props: PageProps) {
  const { role, sub, notify, onNavigate, business } = props;
  const links = usePaymentLinks();
  const { data: customers } = useCustomers();
  const { data: assets } = useAssets();
  // Only mint a publishable key once there's a live link to share.
  const meta = usePublishableKey((links.data ?? []).some((l) => !l.voided));
  const [confirmVoid, setConfirmVoid] = useState<PaymentLink | null>(null);
  const manage = can(role, 'customers.write');

  const url = (l: PaymentLink) =>
    meta.data
      ? checkoutUrl(l.deposit_intent_id, {
          pk: meta.data,
          merchant: business.name,
          customer_name: customerLabel(l.customer_id, customers),
          order_ref: l.title ?? undefined,
          return_url: l.redirect_url ?? undefined,
        })
      : '';

  const open = sub && sub !== 'new' ? links.data?.find((l) => l.id === sub) ?? null : null;
  const keyLimit = meta.error?.code === 'checkout_key_limit' ? meta.error.message : null;

  return (
    <>
      <PageHeader
        title="Payment links"
        description="Send a link, get paid by bank transfer. No website needed."
        actions={
          manage && (
            <Button variant="primary" onClick={() => onNavigate('links', 'new')}>
              <Plus className="size-4" />
              New link
            </Button>
          )
        }
      />

      {keyLimit && (
        <div className="mb-4">
          <CheckoutKeyNeeded message={keyLimit} onNavigate={onNavigate} />
        </div>
      )}

      <Card className="overflow-hidden">
        {links.loading ? (
          <LoadingRows rows={5} />
        ) : links.error ? (
          <ErrorState message={links.error.message} onRetry={links.reload} />
        ) : (links.data ?? []).length === 0 ? (
          <EmptyState title="No payment links yet" description="Create one and share it on WhatsApp, Instagram or email." />
        ) : (
          <ul className="divide-y divide-line">
            {links.data!.map((l) => (
              <li key={l.id} className="flex items-center gap-4 px-5 py-4">
                <button type="button" onClick={() => onNavigate('links', l.id)} className="min-w-0 flex-1 text-left cursor-pointer group">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink truncate group-hover:underline underline-offset-4">{l.title || 'Payment link'}</span>
                    {l.voided && <Pill tone="neutral">Voided</Pill>}
                  </span>
                  <span className="block text-xs text-ink-3 truncate">For {customerLabel(l.customer_id, customers)}</span>
                </button>
                <Money minor={l.amount} asset={l.asset_code} assets={assets} className="text-sm font-medium text-ink" />
                {!l.voided && meta.data && <CopyButton value={url(l)} label="Copy link" />}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Drawer open={Boolean(open)} onClose={() => onNavigate('links')} title="Payment link">
        {open && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight text-ink">{open.title || 'Payment link'}</p>
                {open.description && <p className="mt-1 text-sm text-ink-2">{open.description}</p>}
              </div>
              <Pill tone={open.voided ? 'neutral' : 'positive'}>{open.voided ? 'Voided' : 'Live'}</Pill>
            </div>
            <Money minor={open.amount} asset={open.asset_code} assets={assets} className="mt-4 block text-3xl font-semibold text-ink" />

            {!open.voided &&
              (meta.data ? (
                <>
                  <div className="mt-6">
                    <CopyField value={url(open)} />
                  </div>
                  <div className="mt-6 flex items-center gap-5">
                    <QrCode value={url(open)} className="size-32 border border-line" />
                    <p className="text-sm text-ink-2">Print it on receipts or packaging — customers scan to pay.</p>
                  </div>
                </>
              ) : (
                <div className="mt-6">
                  {keyLimit ? (
                    <CheckoutKeyNeeded message={keyLimit} onNavigate={onNavigate} />
                  ) : (
                    <p className={cx('text-sm', meta.error ? 'text-negative' : 'text-ink-3')}>{meta.error?.message ?? 'Preparing your link…'}</p>
                  )}
                </div>
              ))}

            <div className="mt-6">
              <DetailList
                items={[
                  { term: 'Customer', detail: customerLabel(open.customer_id, customers) },
                  { term: 'Link ID', detail: <span className="font-mono text-[13px] break-all">{open.id}</span> },
                  { term: 'Payment request', detail: <span className="font-mono text-[13px] break-all">{open.deposit_intent_id}</span> },
                  { term: 'Redirect', detail: open.redirect_url ?? '—' },
                ]}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {!open.voided && meta.data && (
                <Button onClick={() => window.open(url(open), '_blank', 'noopener')}>
                  <ExternalLink className="size-4" />
                  Open checkout
                </Button>
              )}
              {!open.voided && manage && (
                <Button variant="danger" onClick={() => setConfirmVoid(open)}>
                  <Ban className="size-4" />
                  Void link
                </Button>
              )}
            </div>
          </>
        )}
      </Drawer>

      {sub === 'new' && <CreateLinkModal props={props} onClose={(id) => onNavigate('links', id)} />}

      {confirmVoid && (
        <Modal
          open
          onClose={() => setConfirmVoid(null)}
          title="Void this link?"
          description="The customer won’t be able to pay with it any more. This can’t be undone."
          footer={
            <>
              <Button onClick={() => setConfirmVoid(null)}>Keep it</Button>
              <AsyncButton
                variant="danger"
                onClick={async () => {
                  try {
                    await v1.post(`payment-links/${confirmVoid.id}/void`);
                    invalidate(`links`);
                    notify('Link voided');
                    setConfirmVoid(null);
                  } catch (e) {
                    notify(e instanceof Error ? e.message : 'Could not void the link', 'error');
                  }
                }}
              >
                Void link
              </AsyncButton>
            </>
          }
        >
          {null}
        </Modal>
      )}
    </>
  );
}
