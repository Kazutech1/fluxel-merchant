/**
 * Money on the wire is a decimal string in minor units — kobo for NGN, base
 * units for crypto (USDT-BSC has 18 decimals). Parsing user input into minor
 * units is done with string arithmetic so nothing is lost to floating point;
 * display converts to a number, which is fine for showing a figure.
 */

import type { Asset } from './models';

const FALLBACK_DECIMALS: Record<string, number> = { NGN: 2, BTC: 8 };

export function decimalsFor(assetCode: string, assets?: Asset[]): number {
  const known = assets?.find((a) => a.asset_code === assetCode)?.decimals;
  if (known !== undefined) return known;
  return FALLBACK_DECIMALS[assetCode] ?? 18;
}

/** "USDT-BSC" → { symbol: "USDT", chain: "BSC" }; "NGN" → { symbol: "NGN" }. */
export function splitAsset(assetCode: string): { symbol: string; chain?: string } {
  const [symbol, chain] = assetCode.split('-');
  return { symbol, chain };
}

export const CHAIN_LABEL: Record<string, string> = {
  bsc: 'BNB Smart Chain',
  BSC: 'BNB Smart Chain',
  eth: 'Ethereum',
  ETH: 'Ethereum',
  ethereum: 'Ethereum',
  tron: 'TRON',
  TRON: 'TRON',
  btc: 'Bitcoin',
  bitcoin: 'Bitcoin',
};

/** Minor-unit string → number of whole units, for display and charts. */
export function toMajor(minor: string | number | null | undefined, decimals: number): number {
  if (minor === null || minor === undefined || minor === '') return 0;
  const n = typeof minor === 'number' ? minor : Number(minor);
  return Number.isFinite(n) ? n / 10 ** decimals : 0;
}

/**
 * "1,250.5" → "125050" (decimals 2). Returns null for anything that isn't a
 * plain positive amount or has more precision than the asset allows.
 */
export function toMinor(input: string, decimals: number): string | null {
  const clean = input.replace(/,/g, '').trim();
  if (!/^\d*\.?\d*$/.test(clean) || clean === '' || clean === '.') return null;
  const [whole = '', frac = ''] = clean.split('.');
  if (frac.length > decimals) return null;
  const digits = ((whole || '0') + frac.padEnd(decimals, '0')).replace(/^0+(?=\d)/, '');
  return digits === '0' ? null : digits;
}

const ngn = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-NG', { notation: 'compact', maximumFractionDigits: 1 });

function cryptoNumber(value: number): string {
  const abs = Math.abs(value);
  const digits = abs === 0 ? 2 : abs < 0.01 ? 6 : abs < 1 ? 4 : 2;
  return new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: digits }).format(value);
}

/** Formats a whole-unit number: "₦1,250.00" or "120.50 USDT". */
export function formatMajor(value: number, assetCode: string, opts: { sign?: boolean; compact?: boolean } = {}): string {
  const { symbol } = splitAsset(assetCode);
  const abs = Math.abs(value);
  const sign = opts.sign ? (value < 0 ? '−' : '+') : value < 0 ? '−' : '';
  if (symbol === 'NGN') return `${sign}₦${opts.compact ? compact.format(abs) : ngn.format(abs)}`;
  return `${sign}${opts.compact ? compact.format(abs) : cryptoNumber(abs)} ${symbol}`;
}

/** Formats a minor-unit string straight from the API. */
export function formatMinor(
  minor: string | null | undefined,
  assetCode: string,
  assets?: Asset[],
  opts: { sign?: boolean; compact?: boolean; negative?: boolean } = {}
): string {
  const value = toMajor(minor, decimalsFor(assetCode, assets));
  return formatMajor(opts.negative ? -value : value, assetCode, opts);
}
