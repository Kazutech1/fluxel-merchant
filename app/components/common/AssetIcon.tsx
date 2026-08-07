'use client';

import React from 'react';
import { AssetCode } from '../../types/dashboard';

interface AssetIconProps {
  code: AssetCode;
  className?: string;
}

export const ASSET_ICON_URLS: Record<AssetCode, string> = {
  NGN: 'https://flagcdn.com/w40/ng.png', // Official Nigeria Flag / Naira Currency Rail Icon
  USDT: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png',
  ETH: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png',
  BTC: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png',
};

export default function AssetIcon({ code, className = 'w-6 h-6' }: AssetIconProps) {
  return (
    <img
      src={ASSET_ICON_URLS[code] || ASSET_ICON_URLS.NGN}
      alt={code}
      className={`rounded-full shrink-0 object-cover shadow-xs border border-slate-200 ${className}`}
    />
  );
}
