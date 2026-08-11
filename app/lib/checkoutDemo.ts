'use client';

import { useEffect } from 'react';
import {
  CheckoutMethod,
  PaymentSession,
  RAILS,
  convertFromNgn,
  issueVirtualAccount,
  patchSession,
} from './paymentSessions';

/* ------------------------------------------------------------------ */
/* Timings                                                             */
/* ------------------------------------------------------------------ */

/** Bank transfers land this long after the payer picks the rail. */
const AUTO_CONFIRM_MS = 15_000;
/** Crypto: how long until the mempool "sees" the transaction. */
const DETECT_MS = 4_000;
/** Total time to walk from 0 to the required block depth, whatever the rail. */
const CONFIRM_WINDOW_MS = 12_000;

/** FLOW_PLAN.md Flow 3 uses ₦40,000 against a ₦50,000 intent as its underpaid example. */
const UNDERPAY_NUMERATOR = BigInt(4);
const UNDERPAY_DENOMINATOR = BigInt(5);

/* ------------------------------------------------------------------ */
/* Transitions                                                         */
/* ------------------------------------------------------------------ */

function amountForRail(session: PaymentSession, method: CheckoutMethod): string {
  return convertFromNgn(session.expected_amount, RAILS[method].asset);
}

export function selectMethod(session: PaymentSession, method: CheckoutMethod): void {
  patchSession(session.reference, {
    method,
    status: 'awaiting_payment',
    confirmations: undefined,
    received_amount: undefined,
    paid_asset: undefined,
    completed_at: undefined,
  });
}

/** Payer asked for account details — mint the account and start its clock. */
export function requestVirtualAccount(session: PaymentSession): void {
  if (session.account_number) return;
  patchSession(session.reference, issueVirtualAccount(session));
}

export function markCompleted(session: PaymentSession): void {
  const method = session.method ?? 'ngn_transfer';
  patchSession(session.reference, {
    status: 'completed',
    paid_asset: RAILS[method].asset,
    received_amount: amountForRail(session, method),
    confirmations: RAILS[method].confirmationsRequired || undefined,
    completed_at: new Date().toISOString(),
  });
}

export function markUnderpaid(session: PaymentSession): void {
  const method = session.method ?? 'ngn_transfer';
  const full = amountForRail(session, method);
  let short = full;
  try {
    short = ((BigInt(full) * UNDERPAY_NUMERATOR) / UNDERPAY_DENOMINATOR).toString();
  } catch {
    /* keep full on parse failure */
  }

  patchSession(session.reference, {
    status: 'underpaid',
    paid_asset: RAILS[method].asset,
    received_amount: short,
    completed_at: new Date().toISOString(),
  });
}

export function markExpired(session: PaymentSession): void {
  patchSession(session.reference, { status: 'expired', confirmations: undefined });
}

/** Reissues the virtual account and drops the payer back on bank transfer. */
export function restartSession(session: PaymentSession): void {
  patchSession(session.reference, {
    status: 'awaiting_payment',
    method: 'ngn_transfer',
    confirmations: undefined,
    received_amount: undefined,
    paid_asset: undefined,
    completed_at: undefined,
    // Drop the old account; a fresh one is issued when the payer asks again.
    account_number: undefined,
    bank_name: undefined,
    account_name: undefined,
    branch: undefined,
    expires_at: undefined,
  });
}

/* ------------------------------------------------------------------ */
/* Auto-advance driver                                                 */
/* ------------------------------------------------------------------ */

/**
 * Walks a session forward on a timer so the checkout demos hands-off. The
 * manual controls in DemoControls call the same transitions, so a presenter
 * can always cut ahead of the clock.
 *
 * Only the checkout mounts this — the dashboard subscribes to the store
 * read-only and must never drive it.
 */
export function useDemoDriver(session: PaymentSession | undefined, enabled: boolean): void {
  const reference = session?.reference;
  const status = session?.status;
  const method = session?.method;
  const confirmations = session?.confirmations;
  const accountIssued = Boolean(session?.account_number);

  useEffect(() => {
    if (!enabled || !session || !reference || !method) return;

    const rail = RAILS[method];

    if (status === 'awaiting_payment') {
      // Fiat settles in one step; crypto first has to be spotted on-chain.
      if (rail.confirmationsRequired === 0) {
        // Nothing can arrive before an account exists to receive it.
        if (!session.account_number) return;
        const timer = setTimeout(() => markCompleted(session), AUTO_CONFIRM_MS);
        return () => clearTimeout(timer);
      }
      const timer = setTimeout(() => {
        patchSession(reference, { status: 'confirming', confirmations: 0 });
      }, DETECT_MS);
      return () => clearTimeout(timer);
    }

    if (status === 'confirming') {
      const required = rail.confirmationsRequired;
      const current = confirmations ?? 0;
      if (current >= required) {
        markCompleted(session);
        return;
      }
      // Every rail takes the same wall-clock time, but counts its own real depth.
      const perBlock = Math.round(CONFIRM_WINDOW_MS / Math.max(required, 1));
      const timer = setTimeout(() => {
        patchSession(reference, { confirmations: current + 1 });
      }, perBlock);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reference, status, method, confirmations, accountIssued]);
}
