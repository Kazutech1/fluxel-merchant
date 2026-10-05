'use client';

import React, { useState } from 'react';
import { Check, Copy, RotateCcw } from 'lucide-react';

import { formatDateTime, formatMoney, NGN_PER_USDT } from '../../lib/console/format';
import type { ConsoleData, Transaction } from '../../lib/console/types';
import { DISPUTE_STATUS, type Page } from './nav';
import { RefundModal, canRefund as isRefundable, refundableLeft } from './RefundsPage';
import { Button, DetailList, Drawer, Money, Pill, StatusBadge } from './ui';
import { DirectionIcon, signedAmount, txnTitle } from './txn';

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[13px]">
      {value}
      <button
        type="button"
        aria-label={`Copy ${value}`}
        onClick={() => {
          navigator.clipboard?.writeText(value).catch(() => {});
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        className="size-6 inline-flex items-center justify-center rounded text-ink-3 hover:text-ink hover:bg-subtle cursor-pointer"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}

function LinkButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-left underline underline-offset-4 decoration-brand hover:decoration-2 cursor-pointer">
      {children}
    </button>
  );
}

const TRIGGER_LABEL = { manual: 'Manual', automatic: 'Automatic rule', scheduled: 'Schedule' } as const;

export default function TransactionDrawer({
  txn,
  data,
  canRefund,
  onClose,
  onRefund,
  onNavigate,
}: {
  txn: Transaction | null;
  data: ConsoleData;
  canRefund: boolean;
  onClose: () => void;
  onRefund: (txnId: string, amount: number, reason: string) => string | null;
  onNavigate: (page: Page, sub?: string) => void;
}) {
  const [refunding, setRefunding] = useState(false);
  if (!txn) return null;

  const customer = data.customers.find((c) => c.id === txn.customerId);
  const destination = data.destinations.find((d) => d.id === txn.destinationId);
  const link = txn.linkId ? data.links.find((l) => l.id === txn.linkId) : undefined;
  const invoice = txn.invoiceId ? data.invoices.find((i) => i.id === txn.invoiceId) : undefined;
  const subscription = txn.subscriptionId ? data.subscriptions.find((s) => s.id === txn.subscriptionId) : undefined;
  const plan = subscription ? data.plans.find((p) => p.id === subscription.planId) : undefined;
  const dispute = txn.disputeId ? data.disputes.find((d) => d.id === txn.disputeId) : undefined;
  const refunds = data.refunds.filter((r) => r.txnId === txn.id);
  const inbound = txn.kind === 'payment';

  const items: { term: string; detail: React.ReactNode }[] = [
    { term: 'Status', detail: <StatusBadge status={txn.status} /> },
    { term: 'Date', detail: formatDateTime(txn.createdAt) },
    { term: 'Reference', detail: <CopyValue value={txn.reference} /> },
    { term: 'Method', detail: txn.method },
  ];

  if (inbound && customer) {
    items.push({
      term: 'Customer',
      detail: (
        <span>
          <LinkButton onClick={() => onNavigate('customers', customer.id)}>{customer.name}</LinkButton>
          <br />
          <span className="text-ink-3">{customer.email}</span>
        </span>
      ),
    });
  }
  if (inbound) {
    items.push({
      term: 'Source',
      detail: link ? (
        <LinkButton onClick={() => onNavigate('links', link.id)}>Payment link · {link.title}</LinkButton>
      ) : invoice ? (
        <LinkButton onClick={() => onNavigate('invoices', invoice.id)}>Invoice {invoice.number}</LinkButton>
      ) : plan ? (
        <LinkButton onClick={() => onNavigate('subscriptions')}>Subscription · {plan.name}</LinkButton>
      ) : (
        `Checkout · ${txn.narration}`
      ),
    });
  }

  if (!inbound && destination) {
    items.push({
      term: 'Paid to',
      detail:
        destination.type === 'bank' ? (
          <span>
            {destination.accountName}
            <br />
            <span className="text-ink-3">
              {destination.bankName} · <span className="font-mono">{destination.accountNumber}</span>
            </span>
          </span>
        ) : (
          <span>
            {destination.label}
            <br />
            <span className="text-ink-3 font-mono text-xs break-all">{destination.address}</span>
          </span>
        ),
    });
    if (txn.trigger) items.push({ term: 'Started by', detail: TRIGGER_LABEL[txn.trigger] });
  }

  items.push({ term: 'Amount', detail: <Money amount={txn.amount} currency={txn.currency} /> });
  items.push({ term: 'Fee', detail: <Money amount={txn.fee} currency={txn.currency} /> });
  items.push(
    inbound
      ? { term: 'You received', detail: <Money amount={txn.amount - txn.fee} currency={txn.currency} className="font-medium" /> }
      : { term: 'Total debited', detail: <Money amount={txn.amount + txn.fee} currency={txn.currency} className="font-medium" /> }
  );
  if (txn.refunded) {
    items.push({
      term: 'Refunded',
      detail: (
        <span>
          <Money amount={txn.refunded} currency={txn.currency} className="font-medium" />
          <span className="text-ink-3"> · {txn.refunded >= txn.amount ? 'full' : 'partial'}</span>
          {refunds.map((r) => (
            <span key={r.id} className="block text-xs text-ink-3">
              {r.reference} · {r.reason}
            </span>
          ))}
        </span>
      ),
    });
  }
  if (dispute) {
    items.push({
      term: 'Dispute',
      detail: (
        <LinkButton onClick={() => onNavigate('disputes', dispute.id)}>
          <Pill tone={DISPUTE_STATUS[dispute.status].tone}>{DISPUTE_STATUS[dispute.status].label}</Pill>
        </LinkButton>
      ),
    });
  }
  if (txn.converted) {
    items.push({
      term: 'Converted to',
      detail: (
        <span>
          <Money amount={txn.converted.amount} currency={txn.converted.currency} className="font-medium" />
          <br />
          <span className="text-xs text-ink-3">at {formatMoney(NGN_PER_USDT, 'NGN')} / USDT</span>
        </span>
      ),
    });
  }

  return (
    <>
      <Drawer open onClose={onClose} title={inbound ? 'Payment' : 'Withdrawal'}>
        <div className="flex items-center gap-3 mb-6">
          <DirectionIcon txn={txn} />
          <div className="min-w-0">
            <p className="text-sm text-ink-2 truncate">{txnTitle(txn, data)}</p>
            <Money amount={signedAmount(txn)} currency={txn.currency} sign className="block text-2xl font-medium text-ink" />
          </div>
        </div>
        <DetailList items={items} />
        {canRefund && isRefundable(txn) && (
          <Button className="mt-6" onClick={() => setRefunding(true)}>
            <RotateCcw className="size-4" />
            Refund{txn.refunded ? ` remaining ${formatMoney(refundableLeft(txn), txn.currency)}` : ''}
          </Button>
        )}
      </Drawer>
      {refunding && <RefundModal txn={txn} data={data} onClose={() => setRefunding(false)} onRefund={onRefund} />}
    </>
  );
}
