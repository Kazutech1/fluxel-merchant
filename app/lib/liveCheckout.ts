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
 */

import { useEffect, useRef, useState } from 'react';
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
const POLL_MS = 4000;

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

export type LiveState =
  | { kind: 'loading' }
  | { kind: 'error'; status: number; message: string }
  | { kind: 'ready'; session: PaymentSession };

/** Polls the intent until it settles. */
export function useLiveSession(reference: string, ctx: CheckoutContext): LiveState {
  const [state, setState] = useState<LiveState>({ kind: 'loading' });
  // The API has no completed_at on intents; stamp it when we first see it
  // settle so ResultPanel's return-to-merchant countdown has a start point.
  const completedAt = useRef<string | undefined>(undefined);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    async function poll() {
      let settled = false;
      try {
        const res = await fetch(`/api/pay/${encodeURIComponent(reference)}`, {
          headers: { 'x-fluxel-pk': ctx.pk },
          cache: 'no-store',
        });
        const body = await res.json();
        if (stopped) return;
        if (!res.ok) {
          setState({ kind: 'error', status: res.status, message: body?.error?.message ?? 'Request failed' });
          // 4xx won't fix itself; 5xx might.
          settled = res.status < 500;
        } else {
          const status = STATUS[(body as IntentResponse).status];
          if (SETTLED.includes(status) && !completedAt.current) completedAt.current = new Date().toISOString();
          setState({ kind: 'ready', session: toSession(body, ctx, completedAt.current) });
          settled = SETTLED.includes(status);
        }
      } catch {
        // Network blip — keep the last good state and try again.
      }
      if (!stopped && !settled) timer = setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [reference, ctx]);

  return state;
}
