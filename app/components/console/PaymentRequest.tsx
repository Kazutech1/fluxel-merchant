'use client';

import React from 'react';

import QrCode from '../checkout/QrCode';
import { checkoutUrl } from '../../lib/console/checkoutLink';
import type { CheckoutContext } from '../../lib/checkoutContext';
import { dash, v1 } from '../../lib/console/client';
import { formatRelative } from '../../lib/console/format';
import { decimalsFor, toMinor } from '../../lib/console/money';
import { useCryptoEnabled } from '../../lib/features';
import type { Asset } from '../../lib/console/models';
import CurrencyIcon from './CurrencyIcon';
import { CopyField, Field, cx, inputClass } from './ui';

/**
 * What a customer can be asked to pay in. Naira goes through a fiat deposit
 * intent (one-time bank account); crypto through a crypto deposit intent
 * (one-time address). The API picks the network for each crypto asset
 * (`api/src/routes/v1/mod.rs::asset_rail`) — `asset` is the code `/v1/assets`
 * lists for that network, which is where the decimals come from.
 */
export const PAY_CURRENCIES = {
  NGN: { label: 'Naira', asset: 'NGN', network: 'Bank transfer', expiry: '30 minutes' },
  USDT: { label: 'USDT', asset: 'USDT-TRON', network: 'TRON (TRC-20)', expiry: '60 minutes' },
  BTC: { label: 'Bitcoin', asset: 'BTC', network: 'Bitcoin', expiry: '60 minutes' },
  ETH: { label: 'Ether', asset: 'ETH', network: 'Ethereum', expiry: '60 minutes' },
} as const;

export type PayCurrency = keyof typeof PAY_CURRENCIES;

/** Hidden when crypto is switched off — naira is then the only choice. */
export function CurrencyPicker({ value, onChange }: { value: PayCurrency; onChange: (c: PayCurrency) => void }) {
  const cryptoOn = useCryptoEnabled();
  if (!cryptoOn) return null;
  return (
    <div>
      <p className="text-sm font-medium text-ink-2 mb-2">Get paid in</p>
      <div role="radiogroup" aria-label="Currency" className="grid grid-cols-4 gap-2">
        {(Object.keys(PAY_CURRENCIES) as PayCurrency[]).map((c) => {
          const active = c === value;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(c)}
              className={cx(
                'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer',
                active ? 'border-gold ring-2 ring-brand/25 bg-gold-soft text-ink' : 'border-line text-ink-2 hover:border-line-strong'
              )}
            >
              <CurrencyIcon asset={PAY_CURRENCIES[c].asset} className="size-7" />
              {PAY_CURRENCIES[c].label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-3">
        {value === 'NGN'
          ? 'Your customer gets a one-time account number to pay into.'
          : `Your customer gets a one-time ${PAY_CURRENCIES[value].label} address on ${PAY_CURRENCIES[value].network}.`}
      </p>
    </div>
  );
}

export function AmountField({
  id,
  currency,
  value,
  onChange,
  assets,
}: {
  id: string;
  currency: PayCurrency;
  value: string;
  onChange: (v: string) => void;
  assets?: Asset[];
}) {
  const decimals = decimalsFor(PAY_CURRENCIES[currency].asset, assets);
  const invalid = value !== '' && !toMinor(value, decimals);
  return (
    <Field
      label="Amount"
      htmlFor={id}
      error={invalid ? `Enter a positive amount with at most ${decimals} decimal places.` : undefined}
    >
      <div className="relative">
        {currency === 'NGN' && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">₦</span>}
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
          placeholder={currency === 'NGN' ? '0.00' : '0.00'}
          className={cx(inputClass, 'font-mono', currency === 'NGN' ? '!pl-8' : '!pr-16')}
        />
        {currency !== 'NGN' && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3">{currency}</span>
        )}
      </div>
    </Field>
  );
}

export interface CreatedRequest {
  intentId: string;
  url: string;
  currency: PayCurrency;
  expiresAt: string | null;
}

/**
 * Creates a crypto payment request for a customer and returns its checkout
 * link. (Naira requests go through payment links or fiat intents directly.)
 */
export async function createCryptoRequest(
  customerId: string,
  currency: Exclude<PayCurrency, 'NGN'>,
  minor: string,
  context: Omit<CheckoutContext, 'pk'>
): Promise<CreatedRequest> {
  const intent = await v1.post<{ id: string; expires_at: string }>(`customers/${customerId}/crypto-deposit-intents`, {
    asset_code: currency,
    expected_amount: minor,
  });
  const { publishableKey } = await dash.get<{ publishableKey: string }>('console?publishable=1');
  return { intentId: intent.id, url: checkoutUrl(intent.id, { pk: publishableKey, ...context }), currency, expiresAt: intent.expires_at };
}

/** The "link is ready" screen — copy, QR and what happens next. */
export function RequestReady({ request }: { request: CreatedRequest }) {
  const crypto = request.currency !== 'NGN';
  return (
    <div className="space-y-5">
      <CopyField value={request.url} />
      <div className="flex items-center gap-4">
        <QrCode value={request.url} className="size-32 shrink-0 border border-line" />
        <div className="text-sm text-ink-2 space-y-2">
          <p>Send the link, or let your customer scan the code.</p>
          <p className="text-ink-3">
            {crypto ? 'The address' : 'The account'} expires{' '}
            {request.expiresAt ? formatRelative(request.expiresAt) : `in ${PAY_CURRENCIES[request.currency].expiry}`}, so send it when they’re
            ready to pay.
          </p>
        </div>
      </div>
      {crypto && (
        <p className="rounded-lg border border-brand/40 bg-gold-soft px-4 py-3 text-xs text-ink-2">
          Copy this link now — crypto payment requests aren’t listed under Payment links yet. Payments still show in Transactions and on the
          customer.
        </p>
      )}
    </div>
  );
}
