import { DepositIntent, DoubleEntryLeg, Transaction } from '../types/dashboard';
import { PaymentSession, RAILS } from './paymentSessions';

/**
 * Projects checkout sessions into the shapes the dashboard already renders, so
 * a payment made on /pay/[reference] shows up in the merchant's intent and
 * transaction lists without either view knowing the checkout exists.
 */

const INTENT_STATUS: Record<PaymentSession['status'], DepositIntent['status']> = {
  awaiting_method: 'pending',
  awaiting_payment: 'pending',
  confirming: 'pending',
  completed: 'completed',
  underpaid: 'underpaid',
  expired: 'expired',
};

/** The virtual account is only minted when the payer asks for it. */
const NOT_ISSUED = 'Not yet issued';

export function sessionToIntent(session: PaymentSession): DepositIntent {
  return {
    id: session.reference,
    customer_id: session.customer_id,
    customer_name: session.customer_name,
    asset_code: session.asset_code,
    expected_amount: session.expected_amount,
    received_amount: session.received_amount,
    status: INTENT_STATUS[session.status],
    created_at: session.created_at,
    expires_at: session.expires_at ?? session.created_at,
    account_number: session.account_number ?? NOT_ISSUED,
    bank_name: session.bank_name ?? NOT_ISSUED,
    account_name: session.account_name ?? NOT_ISSUED,
    qr_payload: session.account_number
      ? `NGN:${session.account_number}:${session.bank_name}:${session.expected_amount}`
      : '',
  };
}

/** Flow 3: Dr settlement float / Cr customer liability. */
function legsFor(session: PaymentSession, amount: string): DoubleEntryLeg[] {
  const asset = session.paid_asset ?? session.asset_code;
  const fiat = asset === 'NGN';

  return [
    {
      account_code: fiat ? '1000-01' : '1000-02',
      account_name: fiat ? 'Lenco Settlement Float' : 'Crypto Treasury Float',
      type: 'debit',
      amount,
      asset_code: asset,
    },
    {
      account_code: fiat ? '2000-01' : '2000-02',
      account_name: fiat ? 'Customer NGN Liability' : 'Customer Crypto Liability',
      type: 'credit',
      amount,
      asset_code: asset,
    },
  ];
}

/** Only settled sessions post to the ledger. */
export function sessionToTransaction(session: PaymentSession): Transaction | null {
  if (session.status !== 'completed' && session.status !== 'underpaid') return null;

  const asset = session.paid_asset ?? session.asset_code;
  const amount = session.received_amount ?? session.expected_amount;
  const rail = session.method ? RAILS[session.method] : undefined;

  return {
    id: `txn_${session.reference.replace(/^fdi_/, '')}`,
    kind: 'deposit',
    asset_code: asset,
    amount,
    status: session.status === 'underpaid' ? 'underpaid' : 'completed',
    correlation_id: session.correlation_id,
    external_ref: session.order_ref,
    customer_id: session.customer_id,
    customer_name: `${session.customer_name} · Checkout${rail ? ` (${rail.label})` : ''}`,
    created_at: session.completed_at ?? session.created_at,
    double_entry_legs: legsFor(session, amount),
    block_confirmations:
      rail && rail.confirmationsRequired > 0
        ? { current: session.confirmations ?? rail.confirmationsRequired, required: rail.confirmationsRequired }
        : undefined,
  };
}

/** Newest first, matching how the dashboard prepends its own records. */
export function sortByCreatedDesc<T extends { created_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
