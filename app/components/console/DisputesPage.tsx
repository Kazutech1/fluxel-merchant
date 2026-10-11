'use client';

import React from 'react';
import { Info } from 'lucide-react';

import { useDisputes, useTransactions } from '../../lib/console/data';
import type { PageProps } from './nav';
import { Button, Card, DetailList, Drawer, EmptyState, ErrorState, LoadingRows, PageHeader, StatusBadge } from './ui';

export default function DisputesPage({ sub, onNavigate, onOpenTxn }: PageProps) {
  const disputes = useDisputes();
  const txns = useTransactions();
  const open = sub ? disputes.data?.find((d) => d.id === sub) ?? null : null;
  const openTxn = open ? txns.data?.find((t) => t.id === open.transaction_id) : undefined;
  const active = (disputes.data ?? []).filter((d) => d.status === 'open' || d.status === 'under_review').length;

  return (
    <>
      <PageHeader
        title="Disputes"
        description={active ? `${active} still open.` : 'Problems you’ve reported with transactions, and how they were resolved.'}
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-line bg-surface px-5 py-4 text-sm">
        <Info className="size-4 mt-0.5 text-gold shrink-0" />
        <p className="text-ink-2">
          To open a dispute, find the transaction and choose <span className="text-ink font-medium">Report a problem</span>. Fluxel reviews it and
          posts the outcome here.
        </p>
      </div>

      <Card className="overflow-hidden">
        {disputes.loading ? (
          <LoadingRows rows={4} />
        ) : disputes.error ? (
          <ErrorState message={disputes.error.message} onRetry={disputes.reload} />
        ) : (disputes.data ?? []).length === 0 ? (
          <EmptyState title="No disputes" description="Nothing reported. Good." />
        ) : (
          <ul className="divide-y divide-line">
            {disputes.data!.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onNavigate('disputes', d.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-subtle cursor-pointer transition-colors"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{d.reason}</span>
                    <span className="block text-xs text-ink-3 font-mono truncate">{d.transaction_id}</span>
                  </span>
                  <StatusBadge status={d.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Drawer open={Boolean(open)} onClose={() => onNavigate('disputes')} title="Dispute">
        {open && (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <p className="text-lg font-semibold tracking-tight text-ink">Dispute</p>
              <StatusBadge status={open.status} />
            </div>
            <DetailList
              items={[
                { term: 'What happened', detail: open.reason },
                { term: 'Transaction', detail: <span className="font-mono text-[13px] break-all">{open.transaction_id}</span> },
                { term: 'Resolution', detail: open.resolution_note ?? (open.status === 'open' ? 'Waiting for review' : '—') },
                { term: 'Dispute ID', detail: <span className="font-mono text-[13px] break-all">{open.id}</span> },
              ]}
            />
            {openTxn && (
              <Button className="mt-6" onClick={() => onOpenTxn(openTxn)}>
                View transaction
              </Button>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
