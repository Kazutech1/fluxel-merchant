'use client';

import React from 'react';
import { AssetCode } from '../../types/dashboard';
import { getAssetSymbol } from '../common/MinorUnitFormatter';

/**
 * Local, dependency-free asset marks. The dashboard's AssetIcon hotlinks
 * flagcdn.com and raw.githubusercontent.com, which is fine inside the app but
 * not on a checkout — four broken images on the money screen if the payer's
 * connection is slow or filtered.
 */
const RAIL_COLORS: Record<AssetCode, string> = {
  NGN: '#008751',
  USDT: '#26A17B',
  ETH: '#627EEA',
  BTC: '#F7931A',
};

interface RailIconProps {
  asset: AssetCode;
  className?: string;
}

export default function RailIcon({ asset, className = 'w-9 h-9 text-base' }: RailIconProps) {
  return (
    <span
      aria-hidden
      className={`shrink-0 inline-flex items-center justify-center rounded-full font-semibold text-white leading-none ${className}`}
      style={{ backgroundColor: RAIL_COLORS[asset] }}
    >
      {getAssetSymbol(asset)}
    </span>
  );
}
