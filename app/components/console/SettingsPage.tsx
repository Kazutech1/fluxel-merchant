'use client';

import React, { useState } from 'react';
import { Building2, Laptop, Plus, Trash2 } from 'lucide-react';

import KybPanel from '../business/KybPanel';
import { dash, invalidate, v1 } from '../../lib/console/client';
import {
  bankName,
  useAssets,
  useBanks,
  useCheckoutConfig,
  useKybTier,
  usePayoutAccounts,
  useSessions,
  useSettlementPreference,
} from '../../lib/console/data';
import { formatDateTime, formatRelative, maskAccount } from '../../lib/console/format';
import type { CheckoutConfig, PayoutAccount } from '../../lib/console/models';
import { ROLE_LABEL, can, isRole } from '../../lib/permissions';
import CurrencyIcon from './CurrencyIcon';
import type { PageProps } from './nav';
import TeamPage from './TeamPage';
import {
  AsyncButton,
  Button,
  Card,
  CardHeader,
  DetailList,
  EmptyState,
  ErrorState,
  Field,
  LoadingRows,
  Modal,
  PageHeader,
  Pill,
  Skeleton,
  StatusBadge,
  Tabs,
  cx,
  inputClass,
  selectClass,
} from './ui';

type Tab = 'business' | 'verification' | 'payouts' | 'checkout' | 'team' | 'security';

const TABS: { value: Tab; label: string }[] = [
  { value: 'business', label: 'Business' },
  { value: 'verification', label: 'Verification' },
  { value: 'payouts', label: 'Payouts' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'team', label: 'Team' },
  { value: 'security', label: 'Security' },
];

/* ------------------------------------------------------------------ */

function BusinessTab({ business, role, userEmail }: PageProps) {
  const tier = useKybTier();
  return (
    <Card>
      <CardHeader title="Your business" description="Your account details on Fluxel." />
      <div className="border-t border-line px-5 py-2">
        <DetailList
          items={[
            { term: 'Business name', detail: business.name },
            { term: 'Business ID', detail: <span className="font-mono text-[13px] break-all">{business.id}</span> },
            { term: 'Status', detail: <StatusBadge status={business.status} /> },
            {
              term: 'Live payments',
              detail: business.tier_1 ? <Pill tone="positive">Enabled</Pill> : <Pill tone="pending">After verification</Pill>,
            },
            { term: 'KYB tier', detail: tier.loading ? <Skeleton className="h-4 w-10" /> : tier.data ? `Tier ${tier.data.tier}${tier.data.note ? ` · ${tier.data.note}` : ''}` : '—' },
            { term: 'Signed in as', detail: `${userEmail} · ${isRole(role) ? ROLE_LABEL[role] : role}` },
          ]}
        />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function AddPayoutAccountModal({ onClose, notify }: { onClose: () => void; notify: PageProps['notify'] }) {
  const banks = useBanks();
  const [bank, setBank] = useState('');
  const [number, setNumber] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const list = banks.data?.banks ?? [];
  const chosen = bank || list[0]?.code || '';

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a bank account"
      description="Withdrawals go to accounts saved here. We check the account name with the bank before saving."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <AsyncButton
            variant="primary"
            disabled={!chosen || number.length !== 10}
            onClick={async () => {
              setError(null);
              try {
                await v1.post('payout-accounts', { bank_code: chosen, account_number: number, label: label.trim() || undefined });
                invalidate(`payout-accounts`);
                notify('Bank account saved');
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not save the account.');
              }
            }}
          >
            Save account
          </AsyncButton>
        </>
      }
    >
      <div className="space-y-5">
        <Field
          label="Bank"
          htmlFor="po-bank"
          hint={banks.data?.fallback ? 'Live bank list unavailable — showing standard bank codes.' : undefined}
        >
          <select id="po-bank" value={chosen} onChange={(e) => setBank(e.target.value)} className={selectClass} disabled={banks.loading}>
            {list.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Account number" htmlFor="po-number">
          <input
            id="po-number"
            inputMode="numeric"
            autoComplete="off"
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="0123456789"
            className={cx(inputClass, 'font-mono')}
          />
        </Field>
        <Field label="Nickname" htmlFor="po-label" hint="Optional — e.g. Main account.">
          <input id="po-label" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} />
        </Field>
        {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      </div>
    </Modal>
  );
}

function PayoutsTab({ role, notify }: PageProps) {
  const accounts = usePayoutAccounts();
  const pref = useSettlementPreference();
  const banks = useBanks();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PayoutAccount | null>(null);
  const canPayout = can(role, 'payouts.write');
  const canSettings = can(role, 'settings.manage');

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader
          title="Bank accounts"
          description="Where your naira withdrawals go."
          actions={
            canPayout && (
              <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
                <Plus className="size-4" />
                Add account
              </Button>
            )
          }
        />
        <div className="border-t border-line">
          {accounts.loading ? (
            <LoadingRows rows={2} />
          ) : accounts.error ? (
            <ErrorState message={accounts.error.message} onRetry={accounts.reload} />
          ) : (accounts.data ?? []).length === 0 ? (
            <EmptyState title="No bank accounts yet" description="Add one so you can withdraw your naira balance." />
          ) : (
            <ul className="divide-y divide-line">
              {accounts.data!.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="size-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-line bg-subtle text-ink-2">
                    <Building2 className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{a.label || a.account_name}</span>
                    <span className="block text-xs text-ink-3 truncate">
                      {a.account_name} · {bankName(a.bank_code, banks.data?.banks)} {maskAccount(a.account_number)}
                    </span>
                  </span>
                  {canPayout && (
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(a)}>
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Settlement" description="What happens to naira as it comes in." />
        <div className="border-t border-line p-5">
          {pref.loading ? (
            <Skeleton className="h-16 w-full" />
          ) : pref.error ? (
            <ErrorState message={pref.error.message} onRetry={pref.reload} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {(
                [
                  { mode: 'accumulate', title: 'Keep it in Fluxel', body: 'Money builds up in your balance. You withdraw when you choose.' },
                  { mode: 'auto_transfer', title: 'Send it to my bank', body: 'Fluxel settles your balance to your bank automatically.' },
                ] as const
              ).map((o) => {
                const active = pref.data?.mode === o.mode;
                return (
                  <button
                    key={o.mode}
                    type="button"
                    disabled={!canSettings || active}
                    aria-pressed={active}
                    onClick={async () => {
                      try {
                        await v1.put('business/settlement-preference', { mode: o.mode });
                        invalidate(`settlement`);
                        notify(o.mode === 'accumulate' ? 'Payments will stay in your balance' : 'Automatic settlement switched on');
                      } catch (e) {
                        notify(e instanceof Error ? e.message : 'Could not change settlement', 'error');
                      }
                    }}
                    className={cx(
                      'text-left p-4 rounded-lg border transition-colors disabled:cursor-default',
                      active ? 'border-gold ring-2 ring-brand/30 bg-gold-soft' : 'border-line hover:border-line-strong cursor-pointer'
                    )}
                  >
                    <span className="block text-sm font-medium text-ink">{o.title}</span>
                    <span className="block mt-0.5 text-xs text-ink-3">{o.body}</span>
                  </button>
                );
              })}
            </div>
          )}
          {!canSettings && <p className="mt-3 text-xs text-ink-3">Only owners and admins can change this.</p>}
        </div>
      </Card>

      {adding && <AddPayoutAccountModal notify={notify} onClose={() => setAdding(false)} />}
      {removing && (
        <Modal
          open
          onClose={() => setRemoving(null)}
          title="Remove this account?"
          description={`${removing.account_name} · ${maskAccount(removing.account_number)} won’t be available for withdrawals.`}
          footer={
            <>
              <Button onClick={() => setRemoving(null)}>Cancel</Button>
              <AsyncButton
                variant="danger"
                onClick={async () => {
                  try {
                    await v1.del(`payout-accounts/${removing.id}`);
                    invalidate(`payout-accounts`);
                    notify('Account removed');
                    setRemoving(null);
                  } catch (e) {
                    notify(e instanceof Error ? e.message : 'Could not remove the account', 'error');
                  }
                }}
              >
                Remove
              </AsyncButton>
            </>
          }
        >
          {null}
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const EMPTY_CHECKOUT: CheckoutConfig = { display_name: '', logo_url: '', success_url: '', cancel_url: '', allowed_assets: [] };

function CheckoutTab(props: PageProps) {
  const config = useCheckoutConfig();
  if (config.loading) return <Card className="p-6"><Skeleton className="h-40 w-full" /></Card>;
  if (config.error || !config.data) return <Card><ErrorState message={config.error?.message ?? 'No checkout settings.'} onRetry={config.reload} /></Card>;
  // Keyed on the saved config, so the form resets to it after every save or reload.
  return <CheckoutForm key={JSON.stringify(config.data)} saved={{ ...EMPTY_CHECKOUT, ...config.data }} {...props} />;
}

function CheckoutForm({ role, business, notify, saved }: PageProps & { saved: CheckoutConfig }) {
  const assets = useAssets();
  const [form, setForm] = useState<CheckoutConfig>(saved);
  const [error, setError] = useState<string | null>(null);
  const editable = can(role, 'settings.manage');

  const normalise = (c: CheckoutConfig) => JSON.stringify({ ...c, allowed_assets: [...c.allowed_assets].sort() });
  const dirty = normalise(form) !== normalise(saved);
  const badUrl = (u: string | null) => Boolean(u) && !/^https:\/\//.test(u!);
  const invalid = badUrl(form.logo_url) || badUrl(form.success_url) || badUrl(form.cancel_url);
  const enabled = (assets.data ?? []).filter((a) => a.enabled);
  const toggle = (code: string) =>
    setForm((f) => ({ ...f, allowed_assets: f.allowed_assets.includes(code) ? f.allowed_assets.filter((x) => x !== code) : [...f.allowed_assets, code] }));

  const set = (k: keyof CheckoutConfig) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_19rem] items-start">
      <Card>
        <CardHeader title="Hosted checkout" description="How your payment page looks and where it sends customers." />
        <div className="border-t border-line p-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Name on checkout" htmlFor="co-name" hint={`Defaults to ${business.name}`}>
              <input id="co-name" value={form.display_name ?? ''} onChange={set('display_name')} disabled={!editable} className={inputClass} />
            </Field>
            <Field label="Logo URL" htmlFor="co-logo" error={badUrl(form.logo_url) ? 'Use an https:// address.' : undefined}>
              <input id="co-logo" value={form.logo_url ?? ''} onChange={set('logo_url')} disabled={!editable} placeholder="https://…/logo.png" className={inputClass} />
            </Field>
            <Field label="After payment, go to" htmlFor="co-success" error={badUrl(form.success_url) ? 'Use an https:// address.' : undefined}>
              <input id="co-success" value={form.success_url ?? ''} onChange={set('success_url')} disabled={!editable} placeholder="https://yourstore.com/thanks" className={inputClass} />
            </Field>
            <Field label="If they cancel, go to" htmlFor="co-cancel" error={badUrl(form.cancel_url) ? 'Use an https:// address.' : undefined}>
              <input id="co-cancel" value={form.cancel_url ?? ''} onChange={set('cancel_url')} disabled={!editable} placeholder="https://yourstore.com/cart" className={inputClass} />
            </Field>
          </div>

          <div>
            <p className="text-sm font-medium text-ink-2 mb-1">Accepted currencies</p>
            <p className="text-xs text-ink-3 mb-3">Leave everything unticked to accept every currency Fluxel supports.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {enabled.map((a) => {
                const on = form.allowed_assets.includes(a.asset_code);
                return (
                  <button
                    key={a.asset_code}
                    type="button"
                    disabled={!editable}
                    aria-pressed={on}
                    onClick={() => toggle(a.asset_code)}
                    className={cx(
                      'flex items-center gap-2 h-11 px-3 rounded-lg border text-sm text-left transition-colors cursor-pointer disabled:cursor-default',
                      on ? 'border-gold ring-2 ring-brand/30 bg-gold-soft text-ink' : 'border-line text-ink-2 hover:border-line-strong'
                    )}
                  >
                    <CurrencyIcon asset={a.asset_code} className="size-6" />
                    {a.asset_code}
                  </button>
                );
              })}
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-negative">{error}</p>}
        </div>
        {editable && (
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-line">
            <Button disabled={!dirty} onClick={() => setForm(saved)}>
              Discard
            </Button>
            <AsyncButton
              variant="primary"
              disabled={!dirty || invalid}
              onClick={async () => {
                setError(null);
                const blank = (v: string | null) => (v && v.trim() ? v.trim() : null);
                try {
                  await v1.put('checkout-config', {
                    display_name: blank(form.display_name),
                    logo_url: blank(form.logo_url),
                    success_url: blank(form.success_url),
                    cancel_url: blank(form.cancel_url),
                    allowed_assets: form.allowed_assets,
                  });
                  invalidate(`checkout`);
                  notify('Checkout saved');
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not save.');
                }
              }}
            >
              Save changes
            </AsyncButton>
          </div>
        )}
      </Card>

      {/* Preview */}
      <div className="rounded-2xl border border-line bg-canvas p-4 lg:sticky lg:top-24">
        <p className="text-xs text-ink-3 mb-3">Preview</p>
        <div className="rounded-xl bg-surface border border-line p-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            {form.logo_url && !badUrl(form.logo_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt="" className="size-8 rounded-lg object-cover border border-line" />
            ) : (
              <span className="size-8 rounded-lg bg-[#0a0a0b] text-brand text-xs font-semibold inline-flex items-center justify-center">
                {(form.display_name || business.name).slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="text-sm font-semibold text-ink truncate">{form.display_name || business.name}</span>
          </div>
          <p className="mt-5 text-xs text-ink-3">Amount to pay</p>
          <p className="text-2xl font-semibold tabular-nums text-ink">₦45,000.00</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(form.allowed_assets.length ? form.allowed_assets : enabled.map((a) => a.asset_code)).slice(0, 6).map((c) => (
              <span key={c} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-line text-xs text-ink-2">
                <CurrencyIcon asset={c} className="size-4" />
                {c}
              </span>
            ))}
          </div>
          <div className="mt-4 h-11 rounded-lg inline-flex w-full items-center justify-center text-sm font-semibold bg-brand text-brand-ink">Pay now</div>
          <p className="mt-3 text-center text-[11px] text-ink-3">
            Secured by <span className="font-semibold text-ink">Fluxel</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SecurityTab({ notify }: PageProps) {
  const sessions = useSessions();
  const [confirmAll, setConfirmAll] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Where you’re signed in"
        description="Every device signed in to your account. Sign out any you don’t recognise."
        actions={
          (sessions.data ?? []).length > 0 && (
            <Button size="sm" variant="danger" onClick={() => setConfirmAll(true)}>
              Sign out everywhere
            </Button>
          )
        }
      />
      <div className="border-t border-line">
        {sessions.loading ? (
          <LoadingRows rows={2} />
        ) : sessions.error ? (
          <ErrorState message={sessions.error.message} onRetry={sessions.reload} />
        ) : (sessions.data ?? []).length === 0 ? (
          <EmptyState title="Only this device" description="No other active sessions." />
        ) : (
          <ul className="divide-y divide-line">
            {sessions.data!.map((s) => (
              <li key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="size-9 rounded-lg bg-subtle border border-line inline-flex items-center justify-center text-ink-2">
                  <Laptop className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">Signed in {formatDateTime(s.created_at)}</span>
                  <span className="block text-xs text-ink-3">Expires {formatRelative(s.expires_at)}</span>
                </span>
                <AsyncButton
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await dash.del(`sessions/${s.id}`);
                      invalidate('sessions');
                      notify('Session signed out');
                    } catch (e) {
                      notify(e instanceof Error ? e.message : 'Could not sign it out', 'error');
                    }
                  }}
                >
                  Sign out
                </AsyncButton>
              </li>
            ))}
          </ul>
        )}
      </div>
      {confirmAll && (
        <Modal
          open
          onClose={() => setConfirmAll(false)}
          title="Sign out everywhere?"
          description="Every session ends, including this one. You’ll need to sign in again."
          footer={
            <>
              <Button onClick={() => setConfirmAll(false)}>Cancel</Button>
              <AsyncButton
                variant="danger"
                onClick={async () => {
                  try {
                    await dash.del('sessions');
                  } finally {
                    window.location.assign('/');
                  }
                }}
              >
                Sign out everywhere
              </AsyncButton>
            </>
          }
        >
          {null}
        </Modal>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export default function SettingsPage(props: PageProps) {
  const tab: Tab = TABS.some((t) => t.value === props.sub) ? (props.sub as Tab) : 'business';
  return (
    <>
      <PageHeader title="Settings" description={`Configuration for ${props.business.name}.`} />
      <Tabs<Tab> label="Settings sections" value={tab} onChange={(v) => props.onNavigate('settings', v === 'business' ? undefined : v)} tabs={TABS} />
      {tab === 'business' && <BusinessTab {...props} />}
      {tab === 'verification' && <KybPanel business={props.business} onBusinessUpdated={props.onBusinessUpdated} />}
      {tab === 'payouts' && <PayoutsTab {...props} />}
      {tab === 'checkout' && <CheckoutTab {...props} />}
      {tab === 'team' && <TeamPage role={props.role} userEmail={props.userEmail} notify={props.notify} />}
      {tab === 'security' && <SecurityTab {...props} />}
    </>
  );
}
