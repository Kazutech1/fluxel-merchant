'use client';

/**
 * Hosted checkout for real deposit intents — the counterpart of the
 * localStorage demo in paymentSessions.ts / checkoutDemo.ts.
 *
 * A merchant creates the intent server-side with its secret key, then sends
 * the payer to `/pay/{intent_id}?c=<context>`. The context (base64url JSON)
 * carries the merchant's publishable key plus display-only details the API
 * doesn't store yet: merchant name, order ref, line items, return URL. Money
 * and status always come from the API, never from the link.
 *
 * Status comes from polling the intent every few seconds, always. A Server-
 * Sent Events stream from `/v1/{crypto,fiat}-deposit-intents/{id}/events`
 * (proxied by `/api/pay/{id}/events`) runs alongside to land changes sooner,
 * but nothing depends on it: a stream that stays connected yet never delivers
 * (a buffering proxy does exactly that) used to leave the page frozen until
 * the payer refreshed.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AssetCode } from '../types/dashboard';
import { CheckoutStatus, PaymentSession } from './paymentSessions';
import type { CheckoutContext } from './checkoutContext';

/** Union of the crypto and fiat intent responses (Fluxel-System/openapi.json). */
interface IntentResponse {
  id: string;
  customer_id: string;
  status: string;
  expected_amount: string;
  expires_at: string;
  created_at?: string;
  // crypto
  asset_code?: string;
  address?: string | null;
  received_amount?: string;
  confirmations?: number;
  required_confirmations?: number;
  // fiat
  amount_received?: string;
  va?: { account_number?: string; account_name?: string; bank_name?: string } | null;
}

const STATUS: Record<string, CheckoutStatus> = {
  pending: 'awaiting_payment',
  ready: 'awaiting_payment',
  confirming: 'confirming',
  fulfilled: 'completed',
  completed: 'completed',
  underpaid: 'underpaid',
  expired: 'expired',
};

const SETTLED: CheckoutStatus[] = ['completed', 'underpaid', 'expired'];

/**
 * Raw API statuses after which nothing more changes (and the server closes
 * the event stream). Includes fiat's `failed`, which has no screen of its own
 * yet — we still stop checking so a finished intent isn't polled forever.
 */
const TERMINAL_RAW = ['fulfilled', 'completed', 'underpaid', 'expired', 'failed'];

/** Poll interval while the page is in view. */
const POLL_MS = 3000;
/** Poll interval while the tab is in the background — it re-checks the moment it's back. */
const HIDDEN_POLL_MS = 15_000;
/** Delay before reopening a stream that dropped before the intent settled. */
const RECONNECT_MS = 3000;
/** Consecutive streams that fail without delivering an event before we stop reopening them. */
const MAX_STREAM_FAILURES = 3;

/**
 * How far along an intent is. Poll and stream answers can arrive out of
 * order, so an older one must never move the page backwards.
 */
function progress(intent: IntentResponse): number {
  if (TERMINAL_RAW.includes(intent.status)) return 3;
  if (intent.status === 'confirming') return 2;
  if (intent.va?.account_number || intent.address) return 1;
  return 0;
}

/**
 * Reads `event: status` frames off a Server-Sent Events body.
 * Resolves when the stream ends (the API closes it on terminal status).
 */
async function readStatusEvents(body: ReadableStream<Uint8Array>, onIntent: (intent: IntentResponse) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    // A lone trailing \r may be half of a \r\n split across chunks — leave it
    // until the next read so it isn't mistaken for a line break of its own.
    buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n|\r(?!$)/g, '\n');
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of frame.split('\n')) {
        if (!line || line.startsWith(':')) continue; // keep-alive comment
        const idx = line.indexOf(':');
        const field = idx === -1 ? line : line.slice(0, idx);
        const val = idx === -1 ? '' : line.slice(idx + 1).replace(/^ /, '');
        if (field === 'event') event = val;
        else if (field === 'data') data.push(val);
      }
      if (event !== 'status' || !data.length) continue;
      try {
        onIntent(JSON.parse(data.join('\n')) as IntentResponse);
      } catch {
        // Malformed frame — skip it, the next status change carries full state.
      }
    }
  }
}

function toSession(intent: IntentResponse, ctx: CheckoutContext, completedAt?: string): PaymentSession {
  const asset = (intent.asset_code ?? 'NGN') as AssetCode;
  const orderRef = ctx.order_ref ?? intent.id;
  return {
    reference: intent.id,
    correlation_id: intent.id,
    invoice_no: orderRef,
    merchant_name: ctx.merchant ?? 'the merchant',
    order_ref: orderRef,
    customer_id: intent.customer_id,
    customer_name: ctx.customer_name ?? 'Customer',
    asset_code: asset,
    expected_amount: intent.expected_amount,
    items: ctx.items?.length ? ctx.items : [{ description: `Order ${orderRef}`, amount: intent.expected_amount }],
    status: STATUS[intent.status] ?? 'awaiting_payment',
    received_amount: intent.received_amount ?? intent.amount_received,
    confirmations: intent.confirmations,
    confirmations_required: intent.required_confirmations,
    created_at: intent.created_at ?? new Date().toISOString(),
    completed_at: completedAt,
    expires_at: intent.expires_at,
    deposit_address: intent.address ?? undefined,
    account_number: intent.va?.account_number,
    account_name: intent.va?.account_name,
    bank_name: intent.va?.bank_name,
    return_url: ctx.return_url,
    live: true,
  };
}

interface LiveReady {
  kind: 'ready';
  session: PaymentSession;
}

export type LiveState =
  | { kind: 'loading' }
  | { kind: 'error'; status: number; message: string }
  | (LiveReady & {
      /** Ask the API right now — "I've sent the money", the countdown reaching zero. */
      refresh: () => void;
    });

/**
 * Follows the intent until it settles.
 *
 * 1. A plain GET for the first render and proper error statuses.
 * 2. Then the same GET on a timer — every `POLL_MS` in view, every
 *    `HIDDEN_POLL_MS` in a background tab, and straight away when the tab
 *    comes back or the connection returns.
 * 3. Alongside, the push stream from `GET /api/pay/{reference}/events`,
 *    reopened when it drops. It only makes updates arrive sooner.
 */
export function useLiveSession(reference: string, ctx: CheckoutContext): LiveState {
  const [state, setState] = useState<LiveReady | Exclude<LiveState, LiveReady>>({ kind: 'loading' });
  // The API has no completed_at on intents; stamp it when we first see it
  // settle so ResultPanel's return-to-merchant countdown has a start point.
  const completedAt = useRef<string | undefined>(undefined);
  const checkNow = useRef<() => void>(() => {});
  const refresh = useCallback(() => checkNow.current(), []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let streamTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let loaded = false;
    let best = -1;
    let inflight = false;
    let streamFailures = 0;
    const abort = new AbortController();
    const path = `/api/pay/${encodeURIComponent(reference)}`;
    const headers = { 'x-fluxel-pk': ctx.pk };

    function stop() {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(streamTimer);
      abort.abort();
    }

    /** Renders an intent unless it's behind what's already on screen. */
    function apply(intent: IntentResponse) {
      const rank = progress(intent);
      if (rank < best) return;
      best = rank;
      loaded = true;
      if (SETTLED.includes(STATUS[intent.status]) && !completedAt.current) completedAt.current = new Date().toISOString();
      setState({ kind: 'ready', session: toSession(intent, ctx, completedAt.current) });
      if (TERMINAL_RAW.includes(intent.status)) stop();
    }

    function schedule() {
      clearTimeout(timer);
      if (stopped) return;
      timer = setTimeout(check, document.visibilityState === 'hidden' ? HIDDEN_POLL_MS : POLL_MS);
    }

    async function check() {
      if (stopped || inflight) return;
      inflight = true;
      try {
        const res = await fetch(path, { headers, cache: 'no-store', signal: abort.signal });
        const body = await res.json().catch(() => null);
        if (stopped) return;
        if (res.ok) {
          apply(body as IntentResponse);
        } else if (!loaded) {
          setState({ kind: 'error', status: res.status, message: body?.error?.message ?? 'Request failed' });
          // A bad link or key won't fix itself; a server hiccup might.
          if (res.status < 500) stop();
        }
      } catch {
        // Network blip — keep what's on screen and try again on the next tick.
      } finally {
        inflight = false;
        schedule();
      }
    }

    async function stream() {
      if (stopped) return;
      let gotEvent = false;
      try {
        const res = await fetch(`${path}/events`, { headers, cache: 'no-store', signal: abort.signal });
        if (res.ok && res.body) {
          await readStatusEvents(res.body, (intent) => {
            if (stopped) return;
            gotEvent = true;
            apply(intent);
          });
        }
      } catch {
        // Aborted, or the connection dropped — polling carries on regardless.
      }
      if (stopped) return;
      streamFailures = gotEvent ? 0 : streamFailures + 1;
      if (streamFailures < MAX_STREAM_FAILURES) streamTimer = setTimeout(stream, RECONNECT_MS);
    }

    function wake() {
      if (document.visibilityState === 'visible') void check();
    }

    checkNow.current = () => void check();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    window.addEventListener('focus', wake);

    void check().then(() => {
      if (loaded) void stream();
    });

    return () => {
      stop();
      checkNow.current = () => {};
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('focus', wake);
    };
  }, [reference, ctx]);

  return state.kind === 'ready' ? { ...state, refresh } : state;
}
