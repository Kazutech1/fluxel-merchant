import React, { useId } from 'react';

import { splitAsset } from '../../lib/console/money';

/**
 * Flat marks for every asset the API lists (`/v1/assets`): the Nigerian flag
 * for naira, and each token's own brand colour and glyph for crypto. Inline
 * SVG — crisp at any size, no network. Chain-specific codes ("USDT-BSC") show
 * the token mark with a small chain badge.
 */

const TOKEN: Record<string, { bg: string; glyph: React.ReactNode }> = {
  USDT: {
    bg: '#26A17B',
    glyph: (
      <path
        fill="#fff"
        d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"
      />
    ),
  },
  USDC: {
    bg: '#2775CA',
    glyph: (
      <>
        <circle cx="16" cy="16" r="9.5" fill="none" stroke="#fff" strokeWidth="1.6" />
        <text x="16" y="20.6" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">
          $
        </text>
      </>
    ),
  },
  BTC: {
    bg: '#F7931A',
    glyph: (
      <text x="16" y="21.5" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif" transform="rotate(14 16 16)">
        ₿
      </text>
    ),
  },
  ETH: {
    bg: '#627EEA',
    glyph: (
      <g fill="#fff">
        <path fillOpacity=".6" d="M16.5 4v8.87l7.5 3.35z" />
        <path d="M16.5 4L9 16.22l7.5-3.35z" />
        <path fillOpacity=".6" d="M16.5 21.97v6.03L24 17.62z" />
        <path d="M16.5 28v-6.03L9 17.62z" />
        <path fillOpacity=".2" d="M16.5 20.57l7.5-4.35-7.5-3.35z" />
        <path fillOpacity=".6" d="M9 16.22l7.5 4.35v-7.7z" />
      </g>
    ),
  },
  BNB: {
    bg: '#F3BA2F',
    glyph: (
      <g fill="#fff">
        <path d="M12.12 14.48L16 10.6l3.88 3.88 2.26-2.26L16 6.08l-6.14 6.14z" />
        <path d="M6.08 16l2.26-2.26L10.6 16l-2.26 2.26z" />
        <path d="M12.12 17.52L16 21.4l3.88-3.88 2.26 2.26L16 25.92l-6.14-6.14z" />
        <path d="M21.4 16l2.26-2.26L25.92 16l-2.26 2.26z" />
        <path d="M18.29 16L16 13.7 14.3 15.4l-.2.2-.39.4 2.29 2.29L18.29 16z" />
      </g>
    ),
  },
  TRX: {
    bg: '#EB0029',
    glyph: <path fill="#fff" d="M8 9l15 3.2-11 13.2zm2.2 1.7l3 8.8 6.6-7.9z" />,
  },
};

const CHAIN_BADGE: Record<string, { bg: string; label: string }> = {
  BSC: { bg: '#F3BA2F', label: 'B' },
  ETH: { bg: '#627EEA', label: 'E' },
  TRON: { bg: '#EB0029', label: 'T' },
  TRX: { bg: '#EB0029', label: 'T' },
};

export default function CurrencyIcon({ asset, className = 'size-8' }: { asset: string; className?: string }) {
  const clip = useId();
  const { symbol, chain } = splitAsset(asset);

  if (symbol === 'NGN') {
    return (
      <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Nigerian naira">
        <clipPath id={clip}>
          <circle cx="16" cy="16" r="16" />
        </clipPath>
        <g clipPath={`url(#${clip})`}>
          <rect width="32" height="32" fill="#fff" />
          <rect width="10.67" height="32" fill="#008751" />
          <rect x="21.33" width="10.67" height="32" fill="#008751" />
        </g>
        <circle cx="16" cy="16" r="15.5" fill="none" stroke="rgb(0 0 0 / 0.12)" />
      </svg>
    );
  }

  const token = TOKEN[symbol];
  const badge = chain ? CHAIN_BADGE[chain.toUpperCase()] : undefined;

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-full" role="img" aria-label={chain ? `${symbol} on ${chain}` : symbol}>
        <circle cx="16" cy="16" r="16" fill={token?.bg ?? '#55555c'} />
        {token?.glyph ?? (
          <text x="16" y="20.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">
            {symbol.slice(0, 3)}
          </text>
        )}
      </svg>
      {badge && (
        <svg viewBox="0 0 12 12" className="absolute -bottom-0.5 -right-0.5 size-[45%]" aria-hidden>
          <circle cx="6" cy="6" r="6" fill="var(--color-surface)" />
          <circle cx="6" cy="6" r="4.8" fill={badge.bg} />
          <text x="6" y="8.2" textAnchor="middle" fontSize="6" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">
            {badge.label}
          </text>
        </svg>
      )}
    </span>
  );
}
