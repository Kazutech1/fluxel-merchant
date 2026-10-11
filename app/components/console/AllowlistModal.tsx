'use client';

import React, { useState } from 'react';
import { Globe, Loader2, Network, Plus, Server, X } from 'lucide-react';

import { ConsoleError, dash } from '../../lib/console/client';
import { parseAllowEntry } from '../../lib/console/ip';
import type { DashboardKey } from '../../lib/console/models';
import type { Notify } from './nav';
import { AsyncButton, Button, Modal, controlClass, cx } from './ui';

interface Entry {
  id: string;
  kind: 'ip' | 'range' | 'host';
  label: string;
  /** What gets saved — one CIDR for an IP or range, every resolved address for a domain. */
  cidrs: string[];
}

const KIND = {
  ip: { icon: Server, label: 'IP address' },
  range: { icon: Network, label: 'IP range' },
  host: { icon: Globe, label: 'Domain' },
};

let seq = 0;
const nextId = () => `e${Date.now()}${seq++}`;

export default function AllowlistModal({ apiKey, onClose, notify }: { apiKey: DashboardKey; onClose: () => void; notify: Notify }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (raw: string) => {
    const pieces = raw.split(/[\s,;]+/).filter(Boolean);
    if (!pieces.length) return;
    setError(null);
    setBusy(true);
    const added: Entry[] = [];
    const problems: string[] = [];
    for (const piece of pieces) {
      const parsed = parseAllowEntry(piece);
      if ('error' in parsed) {
        problems.push(`${piece}: ${parsed.error}`);
        continue;
      }
      if (parsed.kind === 'host') {
        try {
          const { addresses } = await dash.get<{ addresses: string[] }>(`resolve-host?host=${encodeURIComponent(parsed.host)}`);
          added.push({
            id: nextId(),
            kind: 'host',
            label: parsed.host,
            cidrs: addresses.map((a) => (a.includes(':') ? `${a}/128` : `${a}/32`)),
          });
        } catch (e) {
          problems.push(e instanceof ConsoleError ? e.message : `Couldn’t look up ${parsed.host}.`);
        }
      } else {
        added.push({ id: nextId(), kind: parsed.kind, label: parsed.input, cidrs: [parsed.cidr] });
      }
    }
    setEntries((list) => {
      const seen = new Set(list.map((e) => e.label.toLowerCase()));
      return [...list, ...added.filter((e) => !seen.has(e.label.toLowerCase()))];
    });
    setBusy(false);
    if (problems.length) {
      setError(problems.join(' '));
      setDraft(pieces.filter((p) => problems.some((m) => m.includes(p))).join(' '));
    } else {
      setDraft('');
    }
  };

  const cidrs = [...new Set(entries.flatMap((e) => e.cidrs))];

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-xl"
      title="IP allowlist"
      description={`Choose which servers may use ${apiKey.display_prefix}…${apiKey.last4}. Add IP addresses, ranges, or your server’s domain — we’ll look up its addresses.`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <AsyncButton
            variant="primary"
            disabled={busy || Boolean(draft.trim())}
            onClick={async () => {
              try {
                await dash.put(`api-keys/${apiKey.id}/ip-allowlist`, { cidrs });
                notify(cidrs.length ? `Allowlist saved — ${cidrs.length} ${cidrs.length === 1 ? 'address' : 'addresses'}` : 'Allowlist cleared — any address may use this key');
                onClose();
              } catch (e) {
                notify(e instanceof Error ? e.message : 'Could not save the allowlist', 'error');
              }
            }}
          >
            {entries.length ? 'Save allowlist' : 'Allow any address'}
          </AsyncButton>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void add(draft);
        }}
        className="flex gap-2"
      >
        <input
          aria-label="IP address, range or domain"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (/[\s,;]/.test(text.trim())) {
              e.preventDefault();
              void add(text);
            }
          }}
          placeholder="102.89.34.17, 102.89.0.0/16 or api.yourstore.com"
          spellCheck={false}
          autoCapitalize="none"
          className={cx(controlClass, 'h-11 flex-1 font-mono text-[13px]')}
        />
        <Button type="submit" variant="secondary" className="h-11" disabled={busy || !draft.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-negative">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-3">Press Enter to add. You can paste several at once.</p>
      )}

      <div className="mt-5">
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-5 py-6 text-center">
            <p className="text-sm text-ink">No restrictions</p>
            <p className="mt-1 text-xs text-ink-3">Any server with this key can use it. Add an address to lock it down.</p>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {entries.map((e) => {
                const Icon = KIND[e.kind].icon;
                return (
                  <li key={e.id} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5">
                    <span className="size-8 shrink-0 inline-flex items-center justify-center rounded-lg bg-gold-soft text-gold border border-brand/40">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[13px] text-ink truncate">{e.label}</span>
                      <span className="block text-xs text-ink-3 truncate">
                        {e.kind === 'host' ? `${KIND.host.label} → ${e.cidrs.map((c) => c.replace(/\/(32|128)$/, '')).join(', ')}` : KIND[e.kind].label}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${e.label}`}
                      onClick={() => setEntries((list) => list.filter((x) => x.id !== e.id))}
                      className="size-8 shrink-0 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-negative hover:bg-subtle cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {entries.some((e) => e.kind === 'host') && (
              <p className="mt-3 text-xs text-ink-3">
                Domains are saved as the addresses they point to today. If your server’s IP changes, add the domain again.
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
