'use client';

import React, { useState } from 'react';
import { ExternalLink, Flag } from 'lucide-react';

import { invalidate, v1 } from '../../lib/console/client';
import { useAssets, useCustomers, useDisputes } from '../../lib/console/data';
import { formatDateTime, titleCase } from '../../lib/console/format';
import { CHAIN_LABEL, decimalsFor, toMajor } from '../../lib/console/money';
import type { Dispute, Txn } from '../../lib/console/models';
import { can } from '../../lib/permissions';
import { DIRECTION_LABEL, type Notify, type Page } from './nav';
import { AsyncButton, Button, CopyButton, DetailList, Drawer, Field, Modal, Money, StatusBadge, textareaClass } from './ui';
import { DirectionIcon, customerLabel, txnMethod, txnTitle } from './txn';

const EXPLORER: Record<string, (tx: string) => string> = {
  ethereum: (tx) => `https://etherscan.io/tx/${tx}`,
  eth: (tx) => `https://etherscan.io/tx/${tx}`,
  bsc: (tx) => `https://bscscan.com/tx/${tx}`,
  tron: (tx) => `https://tronscan.org/#/transaction/${tx}`,
  bitcoin: (tx) => `https://mempool.space/tx/${tx}`,
  btc: (tx) => `https://mempool.space/tx/${tx}`,
};

function Mono({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[13px] break-all">
      {value}
      <CopyButton value={value} />
    </span>
  );
}

export default function TransactionDrawer({
  txn,
  role,
  onClose,
  onNavigate,
  notify,
}: {
  txn: Txn | null;
  role: string;
  onClose: () => void;
  onNavigate: (page: Page, sub?: string) => void;
  notify: Notify;
}) {
  const { data: assets } = useAssets();
  const { data: customers } = useCustomers();
  const { data: disputes } = useDisputes();
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState('');

  if (!txn) return null;

  const dispute: Dispute | undefined = disputes?.find((d) => d.transaction_id === txn.id);
  const decimals = decimalsFor(txn.asset_code, assets);
  const net = toMajor(txn.amount, decimals) - toMajor(txn.fee, decimals);
  const explorer = txn.txid && txn.chain ? EXPLORER[txn.chain]?.(txn.txid) : undefined;

  const items: { term: string; detail: React.ReactNode }[] = [
    { term: 'Status', detail: <StatusBadge status={txn.status} /> },
    { term: 'Type', detail: `${DIRECTION_LABEL[txn.direction]} · ${txnMethod(txn)}` },
    { term: 'Date', detail: formatDateTime(txn.created_at) },
    { term: 'Transaction ID', detail: <Mono value={txn.id} /> },
  ];
  if (txn.customer_id) {
    items.push({
      term: txn.direction === 'transfer' ? 'From' : 'Customer',
      detail: (
        <button
          type="button"
          onClick={() => onNavigate('customers', txn.customer_id!)}
          className="text-left underline underline-offset-4 decoration-brand hover:decoration-2 cursor-pointer"
        >
          {customerLabel(txn.customer_id, customers)}
        </button>
      ),
    });
  }
  if (txn.to_customer_id) items.push({ term: 'To', detail: customerLabel(txn.to_customer_id, customers) });
  items.push({ term: 'Amount', detail: <Money minor={txn.amount} asset={txn.asset_code} assets={assets} /> });
  items.push({ term: 'Fee', detail: <Money minor={txn.fee} asset={txn.asset_code} assets={assets} /> });
  if (txn.direction === 'in') {
    items.push({ term: 'You received', detail: <Money value={net} asset={txn.asset_code} className="font-medium" /> });
  }
  if (txn.chain) items.push({ term: 'Network', detail: CHAIN_LABEL[txn.chain] ?? titleCase(txn.chain) });
  if (txn.confirmations !== null && txn.confirmations !== undefined) items.push({ term: 'Confirmations', detail: txn.confirmations });
  if (txn.txid) {
    items.push({
      term: 'Blockchain hash',
      detail: (
        <span className="space-y-1">
          <Mono value={txn.txid} />
          {explorer && (
            <a href={explorer} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gold hover:underline">
              View on explorer <ExternalLink className="size-3" />
            </a>
          )}
        </span>
      ),
    });
  }
  if (txn.provider_ref) items.push({ term: 'Bank reference', detail: <Mono value={txn.provider_ref} /> });
  if (dispute) {
    items.push({
      term: 'Dispute',
      detail: (
        <span className="space-y-1">
          <StatusBadge status={dispute.status} />
          <span className="block text-xs text-ink-3">{dispute.reason}</span>
          {dispute.resolution_note && <span className="block text-xs text-ink-2">{dispute.resolution_note}</span>}
        </span>
      ),
    });
  }

  return (
    <>
      <Drawer open onClose={onClose} title={DIRECTION_LABEL[txn.direction]}>
        <div className="flex items-center gap-3 mb-6">
          <DirectionIcon direction={txn.direction} />
          <div className="min-w-0">
            <p className="text-sm text-ink-2 truncate">{txnTitle(txn, customers)}</p>
            <Money
              minor={txn.amount}
              asset={txn.asset_code}
              assets={assets}
              sign={txn.direction !== 'transfer'}
              negative={txn.direction === 'out'}
              className="block text-2xl font-semibold text-ink"
            />
          </div>
        </div>
        <DetailList items={items} />
        {!dispute && can(role, 'payouts.write') && (
          <Button className="mt-6" onClick={() => setDisputing(true)}>
            <Flag className="size-4" />
            Report a problem
          </Button>
        )}
      </Drawer>

      {disputing && (
        <Modal
          open
          onClose={() => setDisputing(false)}
          title="Report a problem with this transaction"
          description="Opens a dispute with Fluxel. Our team reviews it and the outcome shows on the Disputes page."
          footer={
            <>
              <Button onClick={() => setDisputing(false)}>Cancel</Button>
              <AsyncButton
                variant="primary"
                disabled={reason.trim().length < 10}
                onClick={async () => {
                  try {
                    await v1.post('disputes', { transaction_id: txn.id, reason: reason.trim() });
                    invalidate(`disputes`);
                    notify('Dispute opened — we’ll update you on the Disputes page');
                    setDisputing(false);
                    setReason('');
                  } catch (e) {
                    notify(e instanceof Error ? e.message : 'Could not open the dispute', 'error');
                  }
                }}
              >
                Open dispute
              </AsyncButton>
            </>
          }
        >
          <Field label="What went wrong?" htmlFor="dispute-reason" hint="At least 10 characters.">
            <textarea
              id="dispute-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="The customer was charged twice for the same order…"
              className={textareaClass}
            />
          </Field>
        </Modal>
      )}
    </>
  );
}
