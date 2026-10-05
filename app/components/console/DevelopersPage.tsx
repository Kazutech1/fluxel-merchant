'use client';

import React, { useState } from 'react';
import { BookOpen, Plus, RefreshCw, Send } from 'lucide-react';

import { WEBHOOK_EVENTS } from '../../lib/console/demoCatalog';
import { formatDateTime, formatRelativeInline, formatWhen } from '../../lib/console/format';
import type { ApiMode, WebhookDelivery } from '../../lib/console/types';
import { canManage, deliveryStatus, type PageProps } from './nav';
import {
  Button,
  Card,
  CardHeader,
  CopyButton,
  CopyField,
  DetailList,
  Drawer,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pill,
  Segmented,
  Switch,
  Tabs,
  cx,
  inputClass,
  selectClass,
} from './ui';

type Tab = 'keys' | 'webhooks' | 'events';

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative rounded-lg bg-[#0a0a0b] border border-white/10">
      <div className="absolute right-2 top-2 [&_button]:text-slate-400 [&_button:hover]:text-brand [&_button:hover]:bg-white/5">
        <CopyButton value={code} label="Copy code" />
      </div>
      <pre className="overflow-x-auto p-4 pr-12 text-[12.5px] leading-relaxed font-mono text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ApiKeys({ data, store, role, notify }: PageProps) {
  const [mode, setMode] = useState<ApiMode>('live');
  const [confirmRoll, setConfirmRoll] = useState(false);
  const keys = data.apiKeys[mode];
  const snippet = `curl https://api.fluxel.app/v1/payments \\
  -H "Authorization: Bearer ${keys.secretKey.slice(0, 12)}…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 4500000,
    "currency": "NGN",
    "customer": { "email": "amina.bello@gmail.com" },
    "reference": "order_1042"
  }'`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Segmented<ApiMode>
          label="Key mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'test', label: 'Test keys' },
            { value: 'live', label: 'Live keys' },
          ]}
        />
        <p className="text-sm text-ink-3">
          {mode === 'test' ? 'Test keys never move real money.' : 'Live keys charge real customers — keep the secret key on your server.'}
        </p>
      </div>

      <Card>
        <div className="p-5 space-y-5">
          <Field label="Public key" hint="Safe to use in your website or app.">
            <CopyField value={keys.publicKey} />
          </Field>
          <Field label="Secret key" hint="Only use on your server. Never share it or commit it to code.">
            <CopyField value={keys.secretKey} secret />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-line">
          <p className="text-sm text-ink-3">
            Created {formatRelativeInline(keys.createdAt)} · last used {formatRelativeInline(keys.lastUsedAt)}
          </p>
          {canManage(role) && (
            <Button size="sm" variant="danger" onClick={() => setConfirmRoll(true)}>
              <RefreshCw className="size-4" />
              Roll secret key
            </Button>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Quick start"
          description="Create a payment from your server."
          actions={
            <Button size="sm" variant="ghost" onClick={() => notify('API docs open at docs.fluxel.app (not live in the demo)')}>
              <BookOpen className="size-4" />
              API docs
            </Button>
          }
        />
        <div className="px-5 pb-5">
          <CodeBlock code={snippet} />
        </div>
      </Card>

      {confirmRoll && (
        <Modal
          open
          onClose={() => setConfirmRoll(false)}
          title={`Roll the ${mode} secret key?`}
          description="The current key stops working immediately. Update your server with the new key straight away."
          footer={
            <>
              <Button onClick={() => setConfirmRoll(false)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  store.rollSecretKey(mode);
                  notify(`New ${mode} secret key generated`);
                  setConfirmRoll(false);
                }}
              >
                Roll key
              </Button>
            </>
          }
        >
          {null}
        </Modal>
      )}
    </>
  );
}

function AddEndpointModal({ onClose, onAdd }: { onClose: () => void; onAdd: (url: string, events: string[]) => void }) {
  const [url, setUrl] = useState('https://');
  const [events, setEvents] = useState<string[]>(['payment.successful']);
  const [touched, setTouched] = useState(false);
  const error = !/^https:\/\/[^\s/]+\.[^\s]+/.test(url) ? 'Use a full https:// URL.' : events.length === 0 ? 'Pick at least one event.' : null;
  return (
    <Modal
      open
      onClose={onClose}
      title="Add webhook endpoint"
      description="We POST a signed JSON event to this URL whenever something happens."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTouched(true);
              if (error) return;
              onAdd(url.trim(), events);
              onClose();
            }}
          >
            Add endpoint
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Endpoint URL" htmlFor="wh-url" error={touched && error?.startsWith('Use') ? error : undefined}>
          <input id="wh-url" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} className={cx(inputClass, 'font-mono text-[13px]')} />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium text-ink-2 mb-2">Events</legend>
          <div className="grid sm:grid-cols-2 gap-1">
            {WEBHOOK_EVENTS.map((ev) => (
              <label key={ev} className="flex items-center gap-2.5 h-9 px-2 rounded-md hover:bg-subtle cursor-pointer">
                <input
                  type="checkbox"
                  checked={events.includes(ev)}
                  onChange={(e) => setEvents((list) => (e.target.checked ? [...list, ev] : list.filter((x) => x !== ev)))}
                  className="size-4 accent-[var(--color-brand)]"
                />
                <span className="font-mono text-[12.5px] text-ink">{ev}</span>
              </label>
            ))}
          </div>
          {touched && error?.startsWith('Pick') && <p className="mt-1 text-xs text-negative">{error}</p>}
        </fieldset>
      </div>
    </Modal>
  );
}

function Webhooks({ data, store, role, notify }: PageProps) {
  const [adding, setAdding] = useState(false);
  const [testEvent, setTestEvent] = useState<Record<string, string>>({});
  const manage = canManage(role);

  return (
    <>
      <div className="flex justify-between items-center mb-4 gap-3">
        <p className="text-sm text-ink-3">Every event is signed with the endpoint’s secret so you can verify it came from Fluxel.</p>
        {manage && (
          <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add endpoint
          </Button>
        )}
      </div>
      {data.webhooks.length === 0 ? (
        <Card>
          <EmptyState title="No endpoints yet" description="Add one to get notified about payments in real time." />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.webhooks.map((w) => {
            const recent = data.deliveries.filter((d) => d.endpointId === w.id).slice(0, 50);
            const okRate = recent.length ? Math.round((recent.filter((d) => d.status >= 200 && d.status < 300).length / recent.length) * 100) : 100;
            const ev = testEvent[w.id] ?? w.events[0] ?? 'payment.successful';
            return (
              <Card key={w.id}>
                <div className="flex items-start gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[13px] text-ink break-all">{w.url}</p>
                    <p className="mt-1 text-xs text-ink-3">
                      {w.enabled ? <Pill tone="positive">Enabled</Pill> : <Pill tone="neutral">Disabled</Pill>}
                      <span className="ml-3">{okRate}% delivered · last 50 events</span>
                    </p>
                  </div>
                  {manage && (
                    <Switch
                      checked={w.enabled}
                      label="Endpoint enabled"
                      onChange={(on) => {
                        store.updateWebhook(w.id, { enabled: on });
                        notify(on ? 'Endpoint enabled' : 'Endpoint disabled');
                      }}
                    />
                  )}
                </div>
                <div className="px-5 pb-5 space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {w.events.map((e) => (
                      <span key={e} className="h-6 px-2 inline-flex items-center rounded-md bg-subtle border border-line font-mono text-[11.5px] text-ink-2">
                        {e}
                      </span>
                    ))}
                  </div>
                  <Field label="Signing secret">
                    <CopyField value={w.secret} secret />
                  </Field>
                </div>
                {manage && (
                  <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-line">
                    <select
                      aria-label="Test event"
                      value={ev}
                      onChange={(e) => setTestEvent((m) => ({ ...m, [w.id]: e.target.value }))}
                      className={cx(selectClass, '!h-9 !w-auto font-mono text-[12.5px]')}
                    >
                      {WEBHOOK_EVENTS.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => {
                        store.sendTestEvent(w.id, ev);
                        notify(`Test ${ev} sent — 200 OK`);
                      }}
                    >
                      <Send className="size-4" />
                      Send test
                    </Button>
                    <span className="flex-1" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        store.removeWebhook(w.id);
                        notify('Endpoint removed');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {adding && (
        <AddEndpointModal
          onClose={() => setAdding(false)}
          onAdd={(url, events) => {
            store.addWebhook(url, events);
            notify('Endpoint added');
          }}
        />
      )}
    </>
  );
}

function Events({ data, store, role, notify }: PageProps) {
  const [filter, setFilter] = useState<'all' | 'failed'>('all');
  const [open, setOpen] = useState<WebhookDelivery | null>(null);
  const rows = data.deliveries.filter((d) => filter === 'all' || d.status < 200 || d.status >= 300).slice(0, 100);
  const urlOf = (id: string) => data.webhooks.find((w) => w.id === id)?.url ?? 'Removed endpoint';

  return (
    <>
      <div className="mb-4">
        <Segmented
          label="Filter events"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All events' },
            { value: 'failed', label: 'Failed' },
          ]}
        />
      </div>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No events" description={filter === 'failed' ? 'Every delivery succeeded.' : 'Events appear here as they happen.'} />
        ) : (
          <table className="w-full text-sm">
            <thead className="hidden md:table-header-group">
              <tr className="text-left text-xs text-ink-3 border-b border-line">
                <th className="font-medium px-5 py-3">Event</th>
                <th className="font-medium px-5 py-3">Endpoint</th>
                <th className="font-medium px-5 py-3">Response</th>
                <th className="font-medium px-5 py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((d) => {
                const st = deliveryStatus(d);
                return (
                  <tr key={d.id} onClick={() => setOpen(d)} className="hover:bg-subtle cursor-pointer transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-[12.5px] text-ink">{d.event}</span>
                      {d.attempt > 1 && <span className="ml-2 text-xs text-ink-3">retry {d.attempt - 1}</span>}
                    </td>
                    <td className="hidden md:table-cell px-5 py-3 text-ink-3 font-mono text-xs truncate max-w-[16rem]">{urlOf(d.endpointId).replace('https://', '')}</td>
                    <td className="px-5 py-3">
                      <Pill tone={st.tone}>{st.label}</Pill>
                      <span className="ml-2 text-xs text-ink-3">{d.durationMs} ms</span>
                    </td>
                    <td className="px-5 py-3 text-right text-ink-2 whitespace-nowrap">{formatWhen(d.at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Drawer open={Boolean(open)} onClose={() => setOpen(null)} title="Event">
        {open && (
          <>
            <p className="font-mono text-sm text-ink mb-4">{open.event}</p>
            <DetailList
              items={[
                { term: 'Response', detail: <Pill tone={deliveryStatus(open).tone}>{deliveryStatus(open).label}</Pill> },
                { term: 'Endpoint', detail: <span className="font-mono text-xs break-all">{urlOf(open.endpointId)}</span> },
                { term: 'Attempt', detail: open.attempt },
                { term: 'Duration', detail: `${open.durationMs} ms` },
                { term: 'Sent', detail: formatDateTime(open.at) },
                { term: 'Event ID', detail: <span className="font-mono text-xs">{open.id}</span> },
              ]}
            />
            <h3 className="mt-6 mb-2 text-sm font-semibold text-ink">Payload</h3>
            <CodeBlock code={open.payload} />
            {canManage(role) && (
              <Button
                className="mt-4"
                onClick={() => {
                  store.retryDelivery(open.id);
                  notify('Event resent — 200 OK');
                  setOpen(null);
                }}
              >
                <RefreshCw className="size-4" />
                Resend
              </Button>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}

export default function DevelopersPage(props: PageProps) {
  const tab: Tab = props.sub === 'webhooks' || props.sub === 'events' ? props.sub : 'keys';
  const failed = props.data.deliveries.slice(0, 100).filter((d) => d.status < 200 || d.status >= 300).length;
  return (
    <>
      <PageHeader title="Developers" description="API keys, webhooks and event logs for your integration." />
      <Tabs<Tab>
        label="Developer sections"
        value={tab}
        onChange={(v) => props.onNavigate('developers', v === 'keys' ? undefined : v)}
        tabs={[
          { value: 'keys', label: 'API keys' },
          { value: 'webhooks', label: 'Webhooks', count: props.data.webhooks.length },
          { value: 'events', label: 'Event log', count: failed },
        ]}
      />
      {tab === 'keys' && <ApiKeys {...props} />}
      {tab === 'webhooks' && <Webhooks {...props} />}
      {tab === 'events' && <Events {...props} />}
    </>
  );
}
