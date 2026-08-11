'use client';

import { useEffect } from 'react';
import {
  PaymentSession,
  RAILS,
  isCryptoAsset,
  issueDepositAddress,
  issueVirtualAccount,
  patchSession,
} from './paymentSessions';

/* ------------------------------------------------------------------ */
/* Timings                                                             */
/* ------------------------------------------------------------------ */

/** Bank transfers land this long after the account is issued. */
const AUTO_CONFIRM_MS = 15_000;
/** Crypto: how long until the mempool "sees" the transaction. */
const DETECT_MS = 4_000;
/** Total time to walk from 0 to the required block depth, whatever the rail. */
const CONFIRM_WINDOW_MS = 12_000;

/** FLOW_PLAN.md Flow 3 uses ₦40,000 against a ₦50,000 intent as its example. */
const UNDERPAY_NUMERATOR = BigInt(4);
const UNDERPAY_DENOMINATOR = BigInt(5);

/* ------------------------------------------------------------------ */
/* Provisioning                                                        */
/* ------------------------------------------------------------------ */

/** Payer asked for account details — mint the account and start its clock. */
export function requestVirtualAccount(session: PaymentSession): void {
  if (session.account_number) return;
  patchSession(session.reference, issueVirtualAccount(session));
}

/** Payer asked for a deposit address — mint one dedicated to this intent. */
export function requestDepositAddress(session: PaymentSession): void {
  if (session.deposit_address) return;
  patchSession(session.reference, {
    deposit_address: issueDepositAddress(session.asset_code),
  });
}

/** True once the payer has somewhere to send funds. */
export function isRailReady(session: PaymentSession): boolean {
  return isCryptoAsset(session.asset_code)
    ? Boolean(session.deposit_address)
    : Boolean(session.account_number);
}

/* ------------------------------------------------------------------ */
/* Transitions                                                         */
/* ------------------------------------------------------------------ */

export function markCompleted(session: PaymentSession): void {
  patchSession(session.reference, {
    status: 'completed',
    received_amount: session.expected_amount,
    confirmations: RAILS[session.asset_code].confirmationsRequired || undefined,
    completed_at: new Date().toISOString(),
  });
}

export function markUnderpaid(session: PaymentSession): void {
  let short = session.expected_amount;
  try {
    short = (
      (BigInt(session.expected_amount) * UNDERPAY_NUMERATOR) /
      UNDERPAY_DENOMINATOR
    ).toString();
  } catch {
    /* keep full on parse failure */
  }

  patchSession(session.reference, {
    status: 'underpaid',
    received_amount: short,
    completed_at: new Date().toISOString(),
  });
}

export function markExpired(session: PaymentSession): void {
  patchSession(session.reference, { status: 'expired', confirmations: undefined });
}

/** Clears the issued rail so a fresh one is minted when the payer asks again. */
export function restartSession(session: PaymentSession): void {
  patchSession(session.reference, {
    status: 'awaiting_payment',
    confirmations: undefined,
    received_amount: undefined,
    completed_at: undefined,
    account_number: undefined,
    bank_name: undefined,
    account_name: undefined,
    expires_at: undefined,
    deposit_address: undefined,
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
  const asset = session?.asset_code;
  const confirmations = session?.confirmations;
  const railReady = session ? isRailReady(session) : false;

  useEffect(() => {
    if (!enabled || !session || !reference || !asset) return;

    const rail = RAILS[asset];

    if (status === 'awaiting_payment') {
      // Nothing can arrive until the payer has somewhere to send it.
      if (!railReady) return;

      // Fiat settles in one step; crypto first has to be spotted on-chain.
      if (rail.confirmationsRequired === 0) {
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
  }, [enabled, reference, status, asset, confirmations, railReady]);
}
