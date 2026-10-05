'use client';

import React, { useMemo, useState } from 'react';
import { BadgeCheck, Download, Lock, Search, ShieldCheck, Upload } from 'lucide-react';

import { formatDate, formatMoney, formatRelativeInline, formatWhen, initials } from '../../lib/console/format';
import type { BusinessProfile, CheckoutMethod, CheckoutSettings, NotificationKey } from '../../lib/console/types';
import { canManage, downloadCsv, type PageProps } from './nav';
import TeamPage from './TeamPage';
import WithdrawalsPage from './WithdrawalsPage';
import type { Currency } from '../../lib/console/types';
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  Field,
  Modal,
  PageHeader,
  Pill,
  SettingRow,
  Switch,
  Tabs,
  cx,
  controlClass,
  inputClass,
  selectClass,
} from './ui';

type Tab = 'business' | 'payouts' | 'checkout' | 'team' | 'security' | 'notifications' | 'verification' | 'activity';

const TABS: { value: Tab; label: string }[] = [
  { value: 'business', label: 'Business' },
  { value: 'payouts', label: 'Payouts' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'team', label: 'Team' },
  { value: 'security', label: 'Security' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'verification', label: 'Verification' },
  { value: 'activity', label: 'Activity log' },
];

function SaveBar({ dirty, onSave, onReset }: { dirty: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="flex justify-end gap-2 px-5 py-4 border-t border-line">
      <Button disabled={!dirty} onClick={onReset}>
        Discard
      </Button>
      <Button variant="primary" disabled={!dirty} onClick={onSave}>
        Save changes
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BusinessTab({ data, store, role, notify }: PageProps) {
  const [form, setForm] = useState<BusinessProfile>(data.business);
  const dirty = JSON.stringify(form) !== JSON.stringify(data.business);
  const editable = role === 'owner' || role === 'admin';
  const set = (k: keyof BusinessProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const field = (k: keyof BusinessProfile, label: string, hint?: string) => (
    <Field label={label} htmlFor={`biz-${k}`} hint={hint}>
      <input id={`biz-${k}`} value={form[k]} onChange={set(k)} disabled={!editable} className={inputClass} />
    </Field>
  );

  return (
    <Card>
      <CardHeader title="Business profile" description="Shown on receipts, invoices and your checkout." />
      <div className="px-5 pb-5 border-t border-line pt-5">
        <div className="flex items-center gap-4 mb-6">
          <span className="size-16 rounded-xl bg-[#0a0a0b] text-brand text-lg font-semibold inline-flex items-center justify-center">
            {initials(form.tradingName)}
          </span>
          <div>
            <label className={cx('inline-flex', editable ? 'cursor-pointer' : 'pointer-events-none opacity-50')}>
              <span className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-line-strong text-[13px] font-medium text-ink hover:bg-subtle">
                <Upload className="size-4" />
                Upload logo
              </span>
              <input type="file" accept="image/*" className="sr-only" onChange={() => notify('Logo uploaded (demo)')} />
            </label>
            <p className="mt-1 text-xs text-ink-3">Square PNG or SVG, at least 256 × 256.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {field('tradingName', 'Trading name', 'What customers see')}
          {field('legalName', 'Registered name')}
          {field('email', 'Business email')}
          {field('supportEmail', 'Support email', 'Customers reply here')}
          {field('phone', 'Phone')}
          {field('website', 'Website')}
          <div className="sm:col-span-2">{field('address', 'Address')}</div>
          <Field label="Industry" htmlFor="biz-industry">
            <select id="biz-industry" value={form.industry} onChange={set('industry')} disabled={!editable} className={selectClass}>
              {['Retail & e-commerce', 'Fashion', 'Food & beverage', 'Education', 'Logistics', 'Professional services', 'Software', 'Other'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="RC number" htmlFor="biz-rc" hint="Locked after verification">
            <input id="biz-rc" value={form.rcNumber} disabled className={inputClass} />
          </Field>
        </div>
      </div>
      {editable && (
        <SaveBar
          dirty={dirty}
          onReset={() => setForm(data.business)}
          onSave={() => {
            store.updateBusiness(form);
            notify('Business profile saved');
          }}
        />
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

const METHODS: { key: CheckoutMethod; label: string; detail: string }[] = [
  { key: 'bank_transfer', label: 'Bank transfer (NGN)', detail: 'A one-time account number, valid for the checkout window' },
  { key: 'usdt_tron', label: 'USDT on TRON', detail: 'TRC-20 · lowest network fees' },
  { key: 'usdt_bsc', label: 'USDT on BNB Smart Chain', detail: 'BEP-20' },
  { key: 'usdt_eth', label: 'USDT on Ethereum', detail: 'ERC-20 · higher network fees' },
];

const BRAND_COLORS = ['#0f0f10', '#dfa90a', '#1d4ed8', '#15803d', '#b91c1c', '#7c3aed'];

/** Black text on light brand colours, white on dark ones. */
function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#0a0a0b' : '#ffffff';
}

function CheckoutPreview({ s }: { s: CheckoutSettings }) {
  const fee = s.feeBearer === 'customer' ? 450 : 0;
  return (
    <div className="rounded-2xl border border-line bg-canvas p-4">
      <p className="text-xs text-ink-3 mb-3">Preview</p>
      <div className="rounded-xl bg-surface border border-line p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="size-8 rounded-lg inline-flex items-center justify-center text-xs font-semibold" style={{ background: s.brandColor, color: textOn(s.brandColor) }}>
            {initials(s.displayName || 'F')}
          </span>
          <span className="text-sm font-semibold text-ink">{s.displayName || 'Your business'}</span>
        </div>
        <p className="mt-5 text-xs text-ink-3">Amount to pay</p>
        <p className="text-2xl font-semibold tabular-nums text-ink">{formatMoney(45_000 + fee, 'NGN')}</p>
        {fee > 0 && <p className="text-xs text-ink-3">Includes {formatMoney(fee, 'NGN')} fee</p>}
        <div className="mt-4 space-y-2">
          {METHODS.filter((m) => s.methods[m.key]).map((m, i) => (
            <div key={m.key} className={cx('flex items-center gap-2 h-10 px-3 rounded-lg border text-sm', i === 0 ? 'border-ink text-ink' : 'border-line text-ink-2')}>
              <span className={cx('size-3.5 rounded-full border-2', i === 0 ? 'border-ink bg-ink' : 'border-line-strong')} />
              {m.label}
            </div>
          ))}
        </div>
        <div className="mt-4 h-11 rounded-lg inline-flex w-full items-center justify-center text-sm font-semibold" style={{ background: s.brandColor, color: textOn(s.brandColor) }}>
          Pay now
        </div>
        <p className="mt-3 text-center text-[11px] text-ink-3">
          Secured by <span className="font-semibold text-ink">Fluxel</span> · expires in {s.expiryMinutes} min
        </p>
      </div>
    </div>
  );
}

function CheckoutTab({ data, store, role, notify }: PageProps) {
  const [form, setForm] = useState<CheckoutSettings>(data.checkout);
  const dirty = JSON.stringify(form) !== JSON.stringify(data.checkout);
  const editable = canManage(role);
  const noMethods = !Object.values(form.methods).some(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] items-start">
      <Card>
        <CardHeader title="Checkout" description="How your hosted payment page looks and behaves." />
        <div className="border-t border-line p-5 space-y-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Name on checkout" htmlFor="co-name">
              <input id="co-name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} disabled={!editable} className={inputClass} />
            </Field>
            <div>
              <p className="text-sm font-medium text-ink-2 mb-2">Brand colour</p>
              <div className="flex items-center gap-2 h-11">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use ${c}`}
                    aria-pressed={form.brandColor === c}
                    disabled={!editable}
                    onClick={() => setForm({ ...form, brandColor: c })}
                    className={cx('size-8 rounded-full border border-line cursor-pointer', form.brandColor === c && 'ring-2 ring-offset-2 ring-offset-surface ring-brand')}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Custom colour"
                  value={form.brandColor}
                  disabled={!editable}
                  onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                  className="size-8 rounded-full cursor-pointer bg-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink-2 mb-2">Payment methods</p>
            <div className="rounded-lg border border-line divide-y divide-line">
              {METHODS.map((m) => (
                <SettingRow key={m.key} title={m.label} description={m.detail}>
                  <Switch
                    checked={form.methods[m.key]}
                    label={m.label}
                    disabled={!editable}
                    onChange={(on) => setForm({ ...form, methods: { ...form.methods, [m.key]: on } })}
                  />
                </SettingRow>
              ))}
            </div>
            {noMethods && <p className="mt-1.5 text-xs text-negative">Turn on at least one method.</p>}
          </div>

          <div>
            <p className="text-sm font-medium text-ink-2 mb-2">Who pays the Fluxel fee?</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { v: 'merchant' as const, t: 'I do', d: 'Customers pay the exact price.' },
                { v: 'customer' as const, t: 'My customer', d: 'The fee is added at checkout.' },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  disabled={!editable}
                  aria-pressed={form.feeBearer === o.v}
                  onClick={() => setForm({ ...form, feeBearer: o.v })}
                  className={cx(
                    'text-left p-3 rounded-lg border cursor-pointer transition-colors',
                    form.feeBearer === o.v ? 'border-gold ring-2 ring-brand/30 bg-gold-soft' : 'border-line hover:border-line-strong'
                  )}
                >
                  <span className="block text-sm font-medium text-ink">{o.t}</span>
                  <span className="block text-xs text-ink-3">{o.d}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Checkout expires after" htmlFor="co-exp" hint="Bank transfer accounts close after this">
              <select id="co-exp" value={form.expiryMinutes} disabled={!editable} onChange={(e) => setForm({ ...form, expiryMinutes: Number(e.target.value) })} className={selectClass}>
                {[15, 30, 60, 120].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </Field>
            <Field label="After payment, send customers to" htmlFor="co-redirect" hint="Optional — otherwise they see a receipt">
              <input id="co-redirect" value={form.redirectUrl} disabled={!editable} onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })} placeholder="https://yourstore.com/thanks" className={inputClass} />
            </Field>
          </div>

          <div className="rounded-lg border border-line">
            <SettingRow title="Email receipts to customers" description="Sent the moment a payment succeeds.">
              <Switch checked={form.sendReceipts} label="Email receipts" disabled={!editable} onChange={(on) => setForm({ ...form, sendReceipts: on })} />
            </SettingRow>
          </div>
        </div>
        {editable && (
          <SaveBar
            dirty={dirty && !noMethods}
            onReset={() => setForm(data.checkout)}
            onSave={() => {
              store.updateCheckout(form);
              notify('Checkout settings saved');
            }}
          />
        )}
      </Card>
      <div className="lg:sticky lg:top-24">
        <CheckoutPreview s={form} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SecurityTab({ data, store, role, notify }: PageProps) {
  const [confirmOff, setConfirmOff] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '' });
  const s = data.security;
  const owner = role === 'owner' || role === 'admin';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Sign-in" />
        <div className="border-t border-line divide-y divide-line">
          <SettingRow
            title="Two-factor authentication"
            description={s.twoFactor ? 'On — we ask for a code from your authenticator app at sign-in and before withdrawals.' : 'Off — your account is protected by password only.'}
          >
            <Switch
              checked={s.twoFactor}
              label="Two-factor authentication"
              onChange={(on) => {
                if (!on) setConfirmOff(true);
                else {
                  store.updateSecurity({ twoFactor: true }, 'Turned on two-factor authentication');
                  notify('Two-factor authentication is on');
                }
              }}
            />
          </SettingRow>
          <SettingRow title="New sign-in alerts" description="Email me when someone signs in from a new device.">
            <Switch
              checked={s.loginAlerts}
              label="Sign-in alerts"
              onChange={(on) => store.updateSecurity({ loginAlerts: on }, `${on ? 'Turned on' : 'Turned off'} sign-in alerts`)}
            />
          </SettingRow>
          <SettingRow title="Password" description="Last changed 3 months ago.">
            <Button size="sm" onClick={() => setChangingPassword(true)}>
              Change password
            </Button>
          </SettingRow>
        </div>
      </Card>

      <Card>
        <CardHeader title="Withdrawal approvals" description="Require a second teammate to approve large withdrawals." />
        <div className="border-t border-line">
          <SettingRow title="Needs approval above" description="Owners and admins can approve.">
            <select
              aria-label="Approval threshold"
              value={s.approvalThreshold}
              disabled={!owner}
              onChange={(e) => {
                const v = Number(e.target.value);
                store.updateSecurity({ approvalThreshold: v }, v ? `Set withdrawal approvals above ${formatMoney(v, 'NGN')}` : 'Turned off withdrawal approvals');
                notify('Approval rule saved');
              }}
              className={cx(controlClass, 'h-9 !w-auto pr-8 sm:text-sm cursor-pointer')}
            >
              <option value={0}>Off</option>
              {[1_000_000, 5_000_000, 10_000_000, 25_000_000].map((v) => (
                <option key={v} value={v}>
                  {formatMoney(v, 'NGN', { compact: true })}
                </option>
              ))}
            </select>
          </SettingRow>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Where you’re signed in" />
        <ul className="border-t border-line divide-y divide-line">
          {s.sessions.map((x) => (
            <li key={x.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="size-9 rounded-lg bg-subtle border border-line inline-flex items-center justify-center text-ink-2">
                <Lock className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  {x.device} {x.current && <span className="ml-1 text-xs font-normal text-gold">This device</span>}
                </span>
                <span className="block text-xs text-ink-3">
                  {x.location} · {x.ip} · {x.current ? 'active now' : formatRelativeInline(x.lastActiveAt)}
                </span>
              </span>
              {!x.current && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    store.revokeSession(x.id);
                    notify(`Signed out ${x.device}`);
                  }}
                >
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {confirmOff && (
        <Modal
          open
          onClose={() => setConfirmOff(false)}
          title="Turn off two-factor authentication?"
          description="Anyone with your password could sign in and withdraw money. We strongly recommend keeping it on."
          footer={
            <>
              <Button onClick={() => setConfirmOff(false)}>Keep it on</Button>
              <Button
                variant="danger"
                onClick={() => {
                  store.updateSecurity({ twoFactor: false }, 'Turned off two-factor authentication');
                  notify('Two-factor authentication is off');
                  setConfirmOff(false);
                }}
              >
                Turn off
              </Button>
            </>
          }
        >
          {null}
        </Modal>
      )}

      {changingPassword && (
        <Modal
          open
          onClose={() => setChangingPassword(false)}
          title="Change password"
          footer={
            <>
              <Button onClick={() => setChangingPassword(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!pw.current || pw.next.length < 8}
                onClick={() => {
                  store.updateSecurity({}, 'Changed password');
                  notify('Password changed');
                  setPw({ current: '', next: '' });
                  setChangingPassword(false);
                }}
              >
                Update password
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            <Field label="Current password" htmlFor="pw-current">
              <input id="pw-current" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className={inputClass} />
            </Field>
            <Field label="New password" htmlFor="pw-next" hint="At least 8 characters.">
              <input id="pw-next" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={inputClass} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const NOTIFICATION_GROUPS: { title: string; items: { key: NotificationKey; label: string; detail: string }[] }[] = [
  {
    title: 'Money',
    items: [
      { key: 'payment_received', label: 'Every payment received', detail: 'Can be a lot of email on busy days.' },
      { key: 'withdrawal_completed', label: 'Withdrawals completed', detail: 'When money lands in your bank or wallet.' },
      { key: 'refund_processed', label: 'Refunds processed', detail: '' },
      { key: 'invoice_paid', label: 'Invoices paid', detail: '' },
    ],
  },
  {
    title: 'Needs attention',
    items: [
      { key: 'dispute_opened', label: 'New disputes', detail: 'You have 7 days to respond.' },
      { key: 'subscription_failed', label: 'Failed subscription renewals', detail: '' },
    ],
  },
  {
    title: 'Account',
    items: [
      { key: 'team_changes', label: 'Team changes', detail: 'Invites, role changes and removals.' },
      { key: 'weekly_summary', label: 'Weekly summary', detail: 'Every Monday morning.' },
    ],
  },
];

function NotificationsTab({ data, store }: PageProps) {
  const me = data.team.find((m) => m.isYou);
  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-2">
        Emails go to <span className="font-medium text-ink">{me?.email}</span>. In-app notifications always show in the bell.
      </p>
      {NOTIFICATION_GROUPS.map((g) => (
        <Card key={g.title}>
          <CardHeader title={g.title} />
          <div className="border-t border-line divide-y divide-line">
            {g.items.map((it) => (
              <SettingRow key={it.key} title={it.label} description={it.detail || undefined}>
                <Switch checked={data.notifications[it.key]} label={it.label} onChange={(on) => store.setNotification(it.key, on)} />
              </SettingRow>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VerificationTab({ data, store, role, notify }: PageProps) {
  const v = data.verification;
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-[#0a0a0b] text-white p-6">
        <div className="flex items-start gap-4">
          <span className="size-11 rounded-full bg-brand/15 text-brand inline-flex items-center justify-center">
            <BadgeCheck className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold tracking-tight">Verified business · Tier {v.tier}</p>
            <p className="mt-1 text-sm text-slate-400">Your KYB is approved. You can collect and withdraw in naira and USDT.</p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
          <div>
            <dt className="text-xs text-slate-500">Per transaction</dt>
            <dd className="mt-1 text-xl font-semibold text-brand tabular-nums">{formatMoney(v.limits.perTransaction, 'NGN', { compact: true })}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Daily limit</dt>
            <dd className="mt-1 text-xl font-semibold text-brand tabular-nums">{formatMoney(v.limits.daily, 'NGN', { compact: true })}</dd>
          </div>
        </dl>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Documents" description="Kept on file for compliance. Upload missing ones to raise your limits." />
        <ul className="border-t border-line divide-y divide-line">
          {v.documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{doc.name}</span>
                <span className="block text-xs text-ink-3">
                  {doc.description}
                  {doc.uploadedAt && ` · uploaded ${formatDate(doc.uploadedAt)}`}
                </span>
              </span>
              {doc.status === 'approved' && <Pill tone="positive">Approved</Pill>}
              {doc.status === 'in_review' && (
                <Pill tone="pending" pulse>
                  In review
                </Pill>
              )}
              {doc.status === 'missing' &&
                (role === 'owner' || role === 'admin' ? (
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-brand text-brand-ink text-[13px] font-medium hover:bg-brand-strong">
                      <Upload className="size-4" />
                      Upload
                    </span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={() => {
                        store.uploadDocument(doc.id);
                        notify(`${doc.name} uploaded — we’ll review it shortly`);
                      }}
                    />
                  </label>
                ) : (
                  <Pill tone="negative">Missing</Pill>
                ))}
            </li>
          ))}
        </ul>
      </Card>

      <p className="flex items-center gap-2 text-xs text-ink-3">
        <ShieldCheck className="size-4" />
        Documents are encrypted and only seen by Fluxel’s compliance team.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ActivityTab({ data }: PageProps) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.activity.filter((a) => !q || a.action.toLowerCase().includes(q) || a.actor.toLowerCase().includes(q));
  }, [data.activity, query]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by person or action"
            aria-label="Search activity"
            className={cx(controlClass, 'h-10 !pl-10')}
          />
        </div>
        <Button
          onClick={() =>
            downloadCsv('fluxel-activity.csv', [['Time', 'Person', 'Action'], ...rows.map((a) => [new Date(a.at).toISOString(), a.actor, a.action])])
          }
        >
          <Download className="size-4" />
          Export
        </Button>
      </div>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {rows.slice(0, 80).map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={a.actor} size="sm" />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-ink">{a.actor}</span> <span className="text-ink-2">{a.action.charAt(0).toLowerCase() + a.action.slice(1)}</span>
              </span>
              <span className="text-xs text-ink-3 whitespace-nowrap">{formatWhen(a.at)}</span>
            </li>
          ))}
          {rows.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-3">No activity matches.</li>}
        </ul>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function SettingsPage(props: PageProps & { onWithdraw: (c: Currency) => void }) {
  const tab: Tab = TABS.some((t) => t.value === props.sub) ? (props.sub as Tab) : 'business';
  return (
    <>
      <PageHeader title="Settings" description="Your business, payouts, checkout, team and security." />
      <Tabs<Tab> label="Settings sections" value={tab} onChange={(v) => props.onNavigate('settings', v === 'business' ? undefined : v)} tabs={TABS} />
      {tab === 'business' && <BusinessTab key="business" {...props} />}
      {tab === 'payouts' && (
        <WithdrawalsPage
          embedded
          data={props.data}
          store={props.store}
          canWithdraw={props.role !== 'viewer'}
          canManage={canManage(props.role)}
          onWithdraw={props.onWithdraw}
          onOpenTxn={props.onOpenTxn}
          notify={props.notify}
        />
      )}
      {tab === 'checkout' && <CheckoutTab key="checkout" {...props} />}
      {tab === 'team' && <TeamPage data={props.data} store={props.store} role={props.role} notify={props.notify} embedded />}
      {tab === 'security' && <SecurityTab {...props} />}
      {tab === 'notifications' && <NotificationsTab {...props} />}
      {tab === 'verification' && <VerificationTab {...props} />}
      {tab === 'activity' && <ActivityTab {...props} />}
    </>
  );
}
