'use client';

import React from 'react';
import { KeyRound, Loader2, PlugZap } from 'lucide-react';

import { dash, invalidate, type Resource } from '../../lib/console/client';
import { useApiKeys } from '../../lib/console/data';
import { can } from '../../lib/permissions';
import type { Notify } from './nav';
import { AsyncButton, Card, CardHeader, ErrorState } from './ui';

/**
 * Shown in place of the pages until this browser is connected to `/v1`
 * (see `lib/server/consoleKeys.ts`). Connecting mints a sandbox key, and the
 * API allows only two per class — so when the account is full, this explains
 * why and lets an owner free a slot right here.
 */
export default function ConnectState({ conn, role, notify }: { conn: Resource<unknown>; role: string; notify: Notify }) {
  // Only needed for the key-limit screen — fetching earlier would cache a list from before the console's key existed.
  const keys = useApiKeys(conn.error?.code === 'console_key_limit');

  if (conn.loading) {
    return (
      <div className="min-h-[50svh] flex flex-col items-center justify-center text-center">
        <Loader2 className="size-6 animate-spin text-gold" />
        <p className="mt-3 text-sm text-ink-3">Connecting to your account…</p>
      </div>
    );
  }

  if (conn.error?.code !== 'console_key_limit') {
    return (
      <Card>
        <ErrorState message={conn.error?.message ?? 'Could not connect.'} onRetry={conn.reload} />
      </Card>
    );
  }

  const sandboxSecrets = (keys.data ?? []).filter((k) => k.env === 'test' && k.key_class === 'secret');
  const manage = can(role, 'keys.manage');

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <span className="mx-auto size-14 rounded-full bg-gold-soft text-gold inline-flex items-center justify-center border border-brand/40">
          <PlugZap className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">The dashboard can’t connect yet</h1>
        <p className="mt-2 text-sm text-ink-2 leading-relaxed">
          To show your balances and transactions, the dashboard uses one sandbox secret key for this browser. Your account already has the
          maximum of two, so there’s no room for it.
          {manage ? ' Revoke one you no longer use below — anything still using it will stop working.' : ' Ask an owner, admin or developer to revoke one.'}
        </p>
      </div>

      {manage && (
        <Card className="overflow-hidden">
          <CardHeader title="Sandbox secret keys" description="Signed-in dashboards elsewhere also use one each until they sign out." />
          <ul className="border-t border-line divide-y divide-line">
            {sandboxSecrets.map((k) => (
              <li key={k.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="size-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-line bg-subtle text-ink-2">
                  <KeyRound className="size-4" />
                </span>
                <span className="flex-1 font-mono text-[13px] text-ink">
                  {k.display_prefix}
                  {'•'.repeat(16)}
                  {k.last4}
                </span>
                <AsyncButton
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    try {
                      await dash.del(`api-keys/${k.id}`);
                      invalidate('api-keys');
                      notify('Key revoked — connecting…');
                      await conn.reload();
                    } catch (e) {
                      notify(e instanceof Error ? e.message : 'Could not revoke the key', 'error');
                    }
                  }}
                >
                  Revoke
                </AsyncButton>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
