'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Paperclip } from 'lucide-react';

import { DAY_MS, formatDate, formatDateTime, formatMoney, toNgn } from '../../lib/console/format';
import { useNow } from '../../lib/console/useNow';
import type { Dispute } from '../../lib/console/types';
import { DISPUTE_STATUS, canMoveMoney, type PageProps } from './nav';
import { Button, Card, DetailList, Drawer, EmptyState, Modal, Money, PageHeader, Pill, StatStrip, cx, textareaClass } from './ui';
import { txnTitle } from './txn';

function daysLeft(dueBy: number, now: number): string {
  const days = Math.ceil((dueBy - now) / DAY_MS);
  if (days <= 0) return 'Due today';
  return days === 1 ? '1 day left' : `${days} days left`;
}

function Timeline({ d }: { d: Dispute }) {
  const steps = [
    { label: 'Dispute opened', at: d.openedAt, done: true },
    { label: 'Evidence submitted', at: d.evidence ? undefined : undefined, done: Boolean(d.evidence) || d.status === 'accepted' },
    {
      label:
        d.status === 'won'
          ? 'Decided in your favour'
          : d.status === 'lost'
            ? 'Decided for the customer'
            : d.status === 'accepted'
              ? 'You accepted the dispute'
              : 'Bank decision',
      at: d.resolvedAt,
      done: Boolean(d.resolvedAt),
    },
  ];
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s.label} className="relative pl-6 pb-4 last:pb-0">
          {i < steps.length - 1 && <span aria-hidden className="absolute left-[5px] top-3 bottom-0 w-px bg-line" />}
          <span
            aria-hidden
            className={cx('absolute left-0 top-1.5 size-[11px] rounded-full border-2', s.done ? 'bg-ink border-ink' : 'bg-surface border-line-strong')}
          />
          <p className={cx('text-sm', s.done ? 'text-ink' : 'text-ink-3')}>{s.label}</p>
          {s.at && <p className="text-xs text-ink-3">{formatDateTime(s.at)}</p>}
        </li>
      ))}
    </ol>
  );
}

export default function DisputesPage({ data, store, role, sub, notify, onNavigate, onOpenTxn }: PageProps) {
  const now = useNow();
  const [evidence, setEvidence] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const manage = canMoveMoney(role);

  const stats = useMemo(() => {
    const needs = data.disputes.filter((d) => d.status === 'needs_response');
    const openAmount = data.disputes
      .filter((d) => d.status === 'needs_response' || d.status === 'under_review')
      .reduce((s, d) => s + toNgn(d.amount, d.currency), 0);
    const decided = data.disputes.filter((d) => ['won', 'lost', 'accepted'].includes(d.status));
    const won = decided.filter((d) => d.status === 'won').length;
    return { needs, openAmount, winRate: decided.length ? (won / decided.length) * 100 : 0 };
  }, [data.disputes]);

  const open = sub ? data.disputes.find((d) => d.id === sub) ?? null : null;
  const openTxn = open ? data.transactions.find((t) => t.id === open.txnId) : undefined;
  const close = () => {
    onNavigate('disputes');
    setEvidence('');
    setFiles([]);
  };
  const urgent = stats.needs.slice().sort((a, b) => a.dueBy - b.dueBy)[0];

  return (
    <>
      <PageHeader title="Disputes" description="When a customer asks their bank for money back, you can respond here." />

      {urgent && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-negative/30 bg-negative/5 px-5 py-4">
          <AlertTriangle className="size-5 text-negative shrink-0" />
          <p className="flex-1 text-sm text-ink">
            <span className="font-medium">
              {stats.needs.length === 1 ? 'A dispute needs' : `${stats.needs.length} disputes need`} your response.
            </span>{' '}
            <span className="text-ink-2">Respond by {formatDate(urgent.dueBy)} or the customer is refunded automatically.</span>
          </p>
          <Button size="sm" variant="primary" onClick={() => onNavigate('disputes', urgent.id)}>
            Respond
          </Button>
        </div>
      )}

      <StatStrip
        items={[
          { label: 'Needs response', value: stats.needs.length },
          { label: 'Amount in dispute', value: formatMoney(stats.openAmount, 'NGN', { compact: true }) },
          { label: 'Win rate', value: `${Math.round(stats.winRate)}%`, hint: 'Of decided disputes' },
        ]}
      />

      <Card className="overflow-hidden">
        {data.disputes.length === 0 ? (
          <EmptyState title="No disputes" description="Nice — nobody has challenged a payment." />
        ) : (
          <ul className="divide-y divide-line">
            {data.disputes.map((d) => {
              const txn = data.transactions.find((t) => t.id === d.txnId);
              const st = DISPUTE_STATUS[d.status];
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('disputes', d.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-subtle cursor-pointer transition-colors"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink truncate">{txn ? txnTitle(txn, data) : 'Payment'}</span>
                      <span className="block text-xs text-ink-3 truncate">{d.reason}</span>
                    </span>
                    <span className="hidden sm:block w-36 text-right text-xs text-ink-3">
                      {d.status === 'needs_response' || d.status === 'under_review'
                        ? daysLeft(d.dueBy, now)
                        : d.resolvedAt
                          ? `Closed ${formatDate(d.resolvedAt)}`
                          : ''}
                    </span>
                    <span className="w-32 text-right">
                      <Pill tone={st.tone}>{st.label}</Pill>
                    </span>
                    <Money amount={d.amount} currency={d.currency} className="w-32 text-right text-sm text-ink" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Drawer open={Boolean(open)} onClose={close} title="Dispute">
        {open && (
          <>
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <p className="text-sm text-ink-2">{openTxn ? txnTitle(openTxn, data) : 'Payment'}</p>
                <Money amount={open.amount} currency={open.currency} className="block text-2xl font-medium text-ink" />
              </div>
              <Pill tone={DISPUTE_STATUS[open.status].tone}>{DISPUTE_STATUS[open.status].label}</Pill>
            </div>

            <DetailList
              items={[
                { term: 'Reason', detail: open.reason },
                {
                  term: 'Payment',
                  detail: openTxn ? (
                    <button type="button" onClick={() => onOpenTxn(openTxn.id)} className="font-mono text-[13px] underline underline-offset-4 decoration-line-strong hover:decoration-ink cursor-pointer">
                      {openTxn.reference}
                    </button>
                  ) : (
                    '—'
                  ),
                },
                { term: 'Opened', detail: formatDateTime(open.openedAt) },
                { term: 'Respond by', detail: `${formatDate(open.dueBy)}${open.status === 'needs_response' ? ` · ${daysLeft(open.dueBy, now)}` : ''}` },
              ]}
            />

            <h3 className="mt-8 mb-3 text-sm font-semibold text-ink">Progress</h3>
            <Timeline d={open} />

            {open.status === 'needs_response' && manage ? (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-ink">Your response</h3>
                <p className="mt-1 mb-3 text-sm text-ink-3">
                  Explain what happened and attach proof — delivery confirmation, chats, receipts.
                </p>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="The order was delivered on 2 Oct and signed for by the customer…"
                  aria-label="Evidence"
                  className={textareaClass}
                />
                <label className="mt-3 flex items-center gap-2 text-sm text-ink-2 cursor-pointer w-fit hover:text-ink">
                  <Paperclip className="size-4" />
                  Attach files
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((f) => f.name))}
                  />
                </label>
                {files.length > 0 && <p className="mt-1 text-xs text-ink-3">{files.join(', ')}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    disabled={evidence.trim().length < 10}
                    onClick={() => {
                      const text = files.length ? `${evidence.trim()}\n\nAttached: ${files.join(', ')}` : evidence.trim();
                      store.respondToDispute(open.id, text);
                      notify('Evidence submitted — the bank usually decides within a few days (seconds, in the demo)');
                      setEvidence('');
                      setFiles([]);
                    }}
                  >
                    Submit evidence
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmAccept(true)}>
                    Accept dispute
                  </Button>
                </div>
              </div>
            ) : (
              open.evidence && (
                <div className="mt-8">
                  <h3 className="mb-2 text-sm font-semibold text-ink">Evidence you sent</h3>
                  <p className="text-sm text-ink-2 whitespace-pre-line rounded-lg bg-subtle border border-line p-4">{open.evidence}</p>
                </div>
              )
            )}
          </>
        )}
      </Drawer>

      {confirmAccept && open && (
        <Modal
          open
          onClose={() => setConfirmAccept(false)}
          title="Accept this dispute?"
          description={`${formatMoney(open.amount, open.currency)} goes back to the customer from your balance. Only do this if they’re right.`}
          footer={
            <>
              <Button onClick={() => setConfirmAccept(false)}>Go back</Button>
              <Button
                variant="danger"
                onClick={() => {
                  store.acceptDispute(open.id);
                  notify('Dispute accepted — the customer has been refunded');
                  setConfirmAccept(false);
                }}
              >
                Accept and refund
              </Button>
            </>
          }
        >
          {null}
        </Modal>
      )}
    </>
  );
}
