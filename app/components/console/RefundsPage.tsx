'use client';

import React from 'react';
import { Info } from 'lucide-react';

import { useAssets, useCustomers, useRefunds } from '../../lib/console/data';
import { formatWhen } from '../../lib/console/format';
import { Card, EmptyState, ErrorState, LoadingRows, Money, PageHeader, StatusBadge } from './ui';
import { customerLabel } from './txn';

export default function RefundsPage() {
  const refunds = useRefunds();
  const { data: customers } = useCustomers();
  const { data: assets } = useAssets();

  return (
    <>
      <PageHeader title="Refunds" description="Money returned to customers from your naira balance." />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-line bg-surface px-5 py-4 text-sm">
        <Info className="size-4 mt-0.5 text-gold shrink-0" />
        <p className="text-ink-2">
          Refunds are issued by Fluxel on your request — they can’t be started from the dashboard yet. To ask for one, open the transaction
          and choose <span className="text-ink font-medium">Report a problem</span>.
        </p>
      </div>

      <Card className="overflow-hidden">
        {refunds.loading ? (
          <LoadingRows rows={5} />
        ) : refunds.error ? (
          <ErrorState message={refunds.error.message} onRetry={refunds.reload} />
        ) : (refunds.data ?? []).length === 0 ? (
          <EmptyState title="No refunds" description="Refunds you’ve been issued will be listed here." />
        ) : (
          <table className="w-full text-sm">
            <thead className="hidden md:table-header-group">
              <tr className="text-left text-xs text-ink-3 border-b border-line">
                <th className="font-medium px-5 py-3">Customer</th>
                <th className="font-medium px-5 py-3">Status</th>
                <th className="font-medium px-5 py-3">Date</th>
                <th className="font-medium px-5 py-3 text-right">Fee</th>
                <th className="font-medium px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {refunds.data!.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3">
                    <span className="block font-medium text-ink">{customerLabel(r.customer_id, customers)}</span>
                    <span className="block text-xs text-ink-3 font-mono">{r.provider_ref ?? r.id}</span>
                  </td>
                  <td className="hidden md:table-cell px-5 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="hidden md:table-cell px-5 py-3 text-ink-2 whitespace-nowrap">{formatWhen(r.created_at)}</td>
                  <td className="hidden md:table-cell px-5 py-3 text-right text-ink-2">
                    <Money minor={r.fee} asset="NGN" assets={assets} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Money minor={r.amount} asset="NGN" assets={assets} negative className="text-ink" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
