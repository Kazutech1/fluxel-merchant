'use client';

import React from 'react';
import { AssetCode } from '../../types/dashboard';

interface MinorUnitFormatterProps {
  amount: string;
  assetCode: AssetCode;
  className?: string;
  showSymbol?: boolean;
  showCode?: boolean;
}

export function formatMinorUnits(amountStr: string, assetCode: AssetCode): string {
  if (!amountStr) return '0.00';
  
  try {
    const raw = BigInt(amountStr);
    let decimals = 2;
    if (assetCode === 'USDT') decimals = 6;
    if (assetCode === 'ETH') decimals = 18;
    if (assetCode === 'BTC') decimals = 8;

    const base = BigInt(10 ** decimals);
    const integerPart = raw / base;
    const remainder = raw % base;

    const remainderStr = remainder.toString().padStart(decimals, '0');
    
    let displayDecimals = 2;
    if (assetCode === 'ETH' || assetCode === 'BTC') displayDecimals = 4;
    
    const trimmedRemainder = remainderStr.slice(0, displayDecimals);
    const formattedInteger = Number(integerPart).toLocaleString('en-US');

    return `${formattedInteger}.${trimmedRemainder}`;
  } catch {
    return '0.00';
  }
}

export function getAssetSymbol(assetCode: AssetCode): string {
  switch (assetCode) {
    case 'NGN': return '₦';
    case 'USDT': return '$';
    case 'ETH': return 'Ξ';
    case 'BTC': return '₿';
    default: return '';
  }
}

export default function MinorUnitFormatter({
  amount,
  assetCode,
  className = '',
  showSymbol = true,
  showCode = true,
}: MinorUnitFormatterProps) {
  const formatted = formatMinorUnits(amount, assetCode);
  const symbol = showSymbol ? getAssetSymbol(assetCode) : '';

  return (
    <span className={`font-mono font-medium ${className}`}>
      {symbol}{formatted}{showCode ? ` ${assetCode}` : ''}
    </span>
  );
}
