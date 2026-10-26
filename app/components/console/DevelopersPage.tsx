'use client';

import React, { useState } from 'react';
import { BookOpen, ExternalLink, KeyRound, Plus, RefreshCw, RotateCw, Send, ShieldCheck, Trash2 } from 'lucide-react';

import { dash, invalidate, v1 } from '../../lib/console/client';
import { useApiKeys, useConsoleMeta, useWebhookDeliveries, useWebhookEndpoints } from '../../lib/console/data';
import { WEBHOOK_EVENT_GROUPS, type DashboardKey, type Env, type WebhookEndpoint } from '../../lib/console/models';
import { useCryptoEnabled } from '../../lib/features';
import { can } from '../../lib/permissions';
import type { PageProps } from './nav';
import AllowlistModal from './AllowlistModal';
import {
  AsyncButton,
  Button,
  Card,
  CardHeader,
  CodeBlock,
  CopyField,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  LinkButton,
  LoadingRows,
  Modal,
  PageHeader,
  Pill,
  Segmented,
  StatusBadge,
  Tabs,
  cx,
  inputClass,
} from './ui';

type Tab = 'keys' | 'webhooks';

/** Shown once, right after a secret is created. */
function SecretOnce({ title, value, note, onClose }: { title: string; value: string; note: string; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description="Copy it now and store it somewhere safe. You won’t be able to see it again."
      footer={
        <Button variant="primary" onClick={onClose}>
          I’ve saved it
        </Button>
      }
    >
      <div className="space-y-3">
        <CopyField value={value} />
        <p className="text-xs text-ink-3">{note}</p>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* API keys                                                            */
/* ------------------------------------------------------------------ */

function KeysTab({ role, business, notify }: PageProps) {
  const keys = useApiKeys();
  const meta = useConsoleMeta();
  const consoleIds = new Set(meta.data?.keyIds ?? []);
  const [view, setView] = useState<Env>(business.tier_1 ? 'live' : 'test');
  const [creating, setCreating] = useState<null | { cls: 'secret' | 'publishable' }>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<DashboardKey | null>(null);
  const [allowlist, setAllowlist] = useState<DashboardKey | null>(null);
  const manage = can(role, 'keys.manage');
  const liveLocked = view === 'live' && !business.tier_1;

  const all = (keys.data ?? []).filter((k) => k.env === view);
  const yours = all.filter((k) => !consoleIds.has(k.id));
  const sessionKeys = all.filter((k) => consoleIds.has(k.id));

  const create = async (cls: 'secret' | 'publishable', replacing?: DashboardKey) => {
    // Create the new key before revoking the old one, so a failure never leaves you with none.
    const created = await dash.post<{ plaintext: string }>('api-keys', { key_class: cls, env: view });
    if (replacing) await dash.del(`api-keys/${replacing.id}`).catch(() => notify('New key created, but the old one could not be revoked — revoke it manually.', 'error'));
    invalidate('api-keys');
    setRevealed(created.plaintext);
  };

  const base = meta.data?.apiBase || 'https://your-fluxel-api';
  const snippet = `curl ${base}/v1/customers \\
  -H "Authorization: Bearer sk_${view}_…" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{ "external_id": "user_1042", "email": "ada@example.com" }'`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Segmented<Env>
          label="Key environment"
          value={view}
          onChange={setView}
          options={[
            { value: 'test', label: 'Sandbox keys' },
            { value: 'live', label: 'Live keys' },
          ]}
        />
        {manage && !liveLocked && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setCreating({ cls: 'publishable' })}>
              <Plus className="size-4" />
              Publishable key
            </Button>
            <Button size="sm" variant="primary" onClick={() => setCreating({ cls: 'secret' })}>
              <Plus className="size-4" />
              Secret key
            </Button>
          </div>
        )}
      </div>

      {liveLocked && (
        <div className="mb-4 rounded-xl border border-brand/50 bg-gold-soft px-5 py-4 text-sm text-ink-2">
          <span className="font-medium text-ink">Live keys unlock after verification.</span> Submit your KYB in Settings → Verification.
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader
          title={view === 'test' ? 'Sandbox keys' : 'Live keys'}
          description="Publishable keys (pk_) are safe in your website or app. Secret keys (sk_) stay on your server."
        />
        <div className="border-t border-line">
          {keys.loading ? (
            <LoadingRows rows={3} />
          ) : keys.error ? (
            <ErrorState message={keys.error.message} onRetry={keys.reload} />
          ) : yours.length === 0 ? (
            <EmptyState title="No keys yet" description={manage && !liveLocked ? 'Create a secret key to call the API from your server.' : undefined} />
          ) : (
            <ul className="divide-y divide-line">
              {yours.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className="size-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-line bg-subtle text-ink-2">
                    <KeyRound className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[13px] text-ink">
                      {k.display_prefix}
                      {'•'.repeat(16)}
                      {k.last4}
                    </span>
                    <span className="block text-xs text-ink-3">{k.key_class === 'secret' ? 'Secret key' : 'Publishable key'}</span>
                  </span>
                  {manage && (
                    <span className="flex gap-1">
                      {k.key_class === 'secret' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAllowlist(k)}
                        >
                          <ShieldCheck className="size-4" />
                          IP allowlist
                        </Button>
                      )}
                      <AsyncButton
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await create(k.key_class === 'secret' ? 'secret' : 'publishable', k);
                            notify('Key rolled — the old one no longer works');
                          } catch (e) {
                            notify(e instanceof Error ? e.message : 'Could not roll the key', 'error');
                          }
                        }}
                      >
                        <RefreshCw className="size-4" />
                        Roll
                      </AsyncButton>
                      <Button size="sm" variant="ghost" onClick={() => setRevoking(k)}>
                        <Trash2 className="size-4" />
                        Revoke
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {sessionKeys.length > 0 && (
          <p className="px-5 py-3 border-t border-line text-xs text-ink-3">
            {sessionKeys.length} more {sessionKeys.length === 1 ? 'key is' : 'keys are'} used by the dashboard for checkout links. Revoking it stops
            links you’ve already sent from working.
          </p>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Quick start" description="Create a customer from your server." />
        <div className="px-5 pb-5">
          <CodeBlock code={snippet} />
        </div>
      </Card>

      {creating && (
        <Modal
          open
          onClose={() => setCreating(null)}
          title={`New ${view === 'test' ? 'sandbox' : 'live'} ${creating.cls} key`}
          description={
            creating.cls === 'secret'
              ? 'Secret keys can move money. Only use them on your server, never in a browser or app.'
              : 'Publishable keys are read-only and safe to embed in your checkout.'
          }
          footer={
            <>
              <Button onClick={() => setCreating(null)}>Cancel</Button>
              <AsyncButton
                variant="primary"
                onClick={async () => {
                  try {
                    await create(creating.cls);
                    setCreating(null);
                  } catch (e) {
                    notify(e instanceof Error ? e.message : 'Could not create the key', 'error');
                  }
                }}
              >
                Create key
              </AsyncButton>
            </>
          }
        >
          {null}
        </Modal>
      )}

      {revealed && (
        <SecretOnce
          title="Your new key"
          value={revealed}
          note="Anyone with a secret key can act as your business. If it leaks, roll it straight away."
          onClose={() => setRevealed(null)}
        />
      )}

      {revoking && (
        <Modal
          open
          onClose={() => setRevoking(null)}
          title="Revoke this key?"
          description={`${revoking.display_prefix}…${revoking.last4} stops working immediately. Anything still using it will fail.`}
          footer={
            <>
              <Button onClick={() => setRevoking(null)}>Cancel</Button>
              <AsyncButton
                variant="danger"
                onClick={async () => {
                  try {
                    await dash.del(`api-keys/${revoking.id}`);
                    invalidate('api-keys');
                    notify('Key revoked');
                    setRevoking(null);
                  } catch (e) {
                    notify(e instanceof Error ? e.message : 'Could not revoke the key', 'error');
                  }
                }}
              >
                Revoke key
              </AsyncButton>
            </>
          }
        >
          {null}
        </Modal>
      )}

      {allowlist && <AllowlistModal apiKey={allowlist} notify={notify} onClose={() => setAllowlist(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Webhooks                                                            */
/* ------------------------------------------------------------------ */

function AddEndpointModal({ onClose, onCreated }: { onClose: () => void; onCreated: (secret: string) => void }) {
  const cryptoOn = useCryptoEnabled();
  const groups = cryptoOn ? WEBHOOK_EVENT_GROUPS : WEBHOOK_EVENT_GROUPS.filter((g) => !g.crypto);
  const [url, setUrl] = useState('https://');
  const [events, setEvents] = useState<string[]>(['fiat.deposit.settled']);
  const [error, setError] = useState<string | null>(null);
  const valid = /^https:\/\/[^\s/]+\.[^\s]+/.test(url.trim()) && events.length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      title="Add webhook endpoint"
      description="Fluxel POSTs a signed JSON event to this URL whenever something you subscribe to happens."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <AsyncButton
            variant="primary"
            disabled={!valid}
            onClick={async () => {
              setError(null);
              try {
                const created = await v1.post<{ id: string; secret: string }>('webhook-endpoints', { url: url.trim(), events });
                invalidate(`webhooks`);
                onCreated(created.secret);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not add the endpoint.');
              }
            }}
          >
            Add endpoint
          </AsyncButton>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Endpoint URL" htmlFor="wh-url" hint="Must be https.">
          <input id="wh-url" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} className={cx(inputClass, 'font-mono text-[13px]')} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-5">
          {groups.map((g) => (
            <fieldset key={g.label}>
              <legend className="text-sm font-medium text-ink-2 mb-1.5">{g.label}</legend>
              {g.events.map((ev) => (
                <label key={ev} className="flex items-center gap-2.5 h-8 px-1.5 rounded-md hover:bg-subtle cursor-pointer">
                  <input
                    type="checkbox"
                    checked={events.includes(ev)}
                    onChange={(e) => setEvents((list) => (e.target.checked ? [...list, ev] : list.filter((x) => x !== ev)))}
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  <span className="font-mono text-[12px] text-ink">{ev}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      </div>
    </Modal>
  );
}

function DeliveriesDrawer({ endpoint, onClose, notify }: { endpoint: WebhookEndpoint; onClose: () => void; notify: PageProps['notify'] }) {
  const deliveries = useWebhookDeliveries(endpoint.id);
  return (
    <Drawer open onClose={onClose} title="Deliveries">
      <p className="font-mono text-[13px] text-ink break-all mb-6">{endpoint.url}</p>
      {deliveries.loading ? (
        <LoadingRows rows={4} />
      ) : deliveries.error ? (
        <ErrorState message={deliveries.error.message} onRetry={deliveries.reload} />
      ) : (deliveries.data ?? []).length === 0 ? (
        <EmptyState title="No deliveries yet" description="Send a test event to check your endpoint." />
      ) : (
        <ul className="-mx-6 border-y border-line divide-y divide-line">
          {deliveries.data!.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-6 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[12.5px] text-ink truncate">{d.event_id}</span>
                <span className="block text-xs text-ink-3">
                  {d.attempts} {d.attempts === 1 ? 'attempt' : 'attempts'}
                </span>
              </span>
              <StatusBadge status={d.status} />
              <AsyncButton
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await v1.post(`webhook-deliveries/${d.id}/replay`);
                    invalidate(`webhooks:${endpoint.id}`);
                    notify('Event resent');
                  } catch (e) {
                    notify(e instanceof Error ? e.message : 'Could not resend', 'error');
                  }
                }}
              >
                <RotateCw className="size-4" />
                Resend
              </AsyncButton>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

function WebhooksTab({ notify }: PageProps) {
  const endpoints = useWebhookEndpoints();
  const [adding, setAdding] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [viewing, setViewing] = useState<WebhookEndpoint | null>(null);
  const [removing, setRemoving] = useState<WebhookEndpoint | null>(null);

  return (
    <>
      <div className="flex justify-between items-center gap-3 mb-4">
        <p className="text-sm text-ink-3">Every event is signed with the endpoint’s secret so you can verify it came from Fluxel.</p>
        <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Add endpoint
        </Button>
      </div>

      <Card className="overflow-hidden">
        {endpoints.loading ? (
          <LoadingRows rows={2} />
        ) : endpoints.error ? (
          <ErrorState message={endpoints.error.message} onRetry={endpoints.reload} />
        ) : (endpoints.data ?? []).length === 0 ? (
          <EmptyState title="No endpoints yet" description="Add one to hear about payments the moment they land." />
        ) : (
          <ul className="divide-y divide-line">
            {endpoints.data!.map((w) => (
              <li key={w.id} className="p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[13px] text-ink break-all">{w.url}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {w.events.map((e) => (
                        <span key={e} className="h-6 px-2 inline-flex items-center rounded-md bg-subtle border border-line font-mono text-[11px] text-ink-2">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Pill tone={w.status === 'active' ? 'positive' : 'neutral'}>{w.status === 'active' ? 'Active' : w.status}</Pill>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <AsyncButton
                    size="sm"
                    onClick={async () => {
                      try {
                        await v1.post(`webhook-endpoints/${w.id}/test`);
                        invalidate(`webhooks:${w.id}`);
                        notify('Test event sent');
                      } catch (e) {
                        notify(e instanceof Error ? e.message : 'Test failed', 'error');
                      }
                    }}
                  >
                    <Send className="size-4" />
                    Send test
                  </AsyncButton>
                  <Button size="sm" onClick={() => setViewing(w)}>
                    Deliveries
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(w)}>
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {adding && (
        <AddEndpointModal
         
          onClose={() => setAdding(false)}
          onCreated={(s) => {
            setAdding(false);
            setSecret(s);
          }}
        />
      )}
      {secret && (
        <SecretOnce
          title="Endpoint added — here’s its signing secret"
          value={secret}
          note="Use it to verify the signature on every event you receive."
          onClose={() => setSecret(null)}
        />
      )}
      {viewing && <DeliveriesDrawer endpoint={viewing} onClose={() => setViewing(null)} notify={notify} />}
      {removing && (
        <Modal
          open
          onClose={() => setRemoving(null)}
          title="Remove this endpoint?"
          description="Fluxel stops sending events to it straight away."
          footer={
            <>
              <Button onClick={() => setRemoving(null)}>Cancel</Button>
              <AsyncButton
                variant="danger"
                onClick={async () => {
                  try {
                    await v1.del(`webhook-endpoints/${removing.id}`);
                    invalidate(`webhooks`);
                    notify('Endpoint removed');
                    setRemoving(null);
                  } catch (e) {
                    notify(e instanceof Error ? e.message : 'Could not remove the endpoint', 'error');
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
    </>
  );
}

export default function DevelopersPage(props: PageProps) {
  const tab: Tab = props.sub === 'webhooks' ? 'webhooks' : 'keys';
  const canKeys = can(props.role, 'keys.manage');
  const canHooks = can(props.role, 'webhooks.manage');

  return (
    <>
      <PageHeader
        title="Developers"
        description="API keys and webhooks for your integration."
        actions={
          <LinkButton href="/docs" target="_blank" rel="noopener">
            <BookOpen className="size-4" />
            Docs
            <ExternalLink className="size-3.5 text-ink-3" />
          </LinkButton>
        }
      />
      <Tabs<Tab>
        label="Developer sections"
        value={tab}
        onChange={(v) => props.onNavigate('developers', v === 'keys' ? undefined : v)}
        tabs={[
          { value: 'keys', label: 'API keys' },
          { value: 'webhooks', label: 'Webhooks' },
        ]}
      />
      {tab === 'keys' &&
        (canKeys ? <KeysTab {...props} /> : <Card><EmptyState title="Ask an owner or developer" description="Your role can’t manage API keys." /></Card>)}
      {tab === 'webhooks' &&
        (canHooks ? (
          <WebhooksTab {...props} />
        ) : (
          <Card>
            <EmptyState title="Ask an owner or developer" description="Your role can’t manage webhooks." />
          </Card>
        ))}
    </>
  );
}
