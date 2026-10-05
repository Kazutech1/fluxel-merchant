import type { Currency, Destination, PayoutRule } from './types';

/** Demo conversion rate used whenever a withdrawal crosses currencies. */
export const NGN_PER_USDT = 1545;

export const WITHDRAWAL_FEE: Record<Currency, number> = { NGN: 50, USDT: 1 };

export const DAY_MS = 86_400_000;

const plain = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-NG', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * `₦1,250.00` / `120.50 USDT`. A real minus sign rather than a hyphen so
 * columns of signed amounts line up in tabular figures.
 */
export function formatMoney(
  amount: number,
  currency: Currency,
  opts: { sign?: boolean; compact?: boolean } = {}
): string {
  const abs = Math.abs(amount);
  const body = opts.compact ? compact.format(abs) : plain.format(abs);
  const sign = opts.sign ? (amount < 0 ? '−' : '+') : amount < 0 ? '−' : '';
  return currency === 'NGN' ? `${sign}₦${body}` : `${sign}${body} USDT`;
}

export function toNgn(amount: number, currency: Currency): number {
  return currency === 'NGN' ? amount : amount * NGN_PER_USDT;
}

export function convert(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  const out = from === 'NGN' ? amount / NGN_PER_USDT : amount * NGN_PER_USDT;
  return Math.floor(out * 100) / 100;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export const formatDate = (t: number) => dateFmt.format(t);
export const formatShortDate = (t: number) => shortDateFmt.format(t);
export const formatTime = (t: number) => timeFmt.format(t);
export const formatDateTime = (t: number) => `${dateFmt.format(t)}, ${timeFmt.format(t)}`;

/** "Today, 14:02" · "Yesterday, 09:15" · "3 Oct, 11:40" */
export function formatWhen(t: number, now = Date.now()): string {
  const startToday = startOfDay(now);
  if (t >= startToday) return `Today, ${formatTime(t)}`;
  if (t >= startToday - DAY_MS) return `Yesterday, ${formatTime(t)}`;
  return `${formatShortDate(t)}, ${formatTime(t)}`;
}

export function formatRelative(t: number | null, now = Date.now()): string {
  if (t === null) return 'Never';
  const mins = Math.round((now - t) / 60_000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return formatDate(t);
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function initials(name: string): string {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

export function maskAccount(accountNumber: string): string {
  return `••${accountNumber.slice(-4)}`;
}

export function shortAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/** One line that identifies a payout account: "GTBank ••4821" / "TRON · TQ8xA2…k2Fd". */
export function destinationSummary(d: Destination): string {
  return d.type === 'bank'
    ? `${d.bankName} ${maskAccount(d.accountNumber)}`
    : `${d.network} · ${shortAddress(d.address)}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const weekdayName = (i: number) => WEEKDAYS[i];

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Plain-English summary of a payout rule, for lists. */
export function describeRule(rule: PayoutRule): string {
  switch (rule.mode) {
    case 'manual':
      return 'You withdraw when you choose';
    case 'automatic':
      return `Automatically when balance reaches ${formatMoney(rule.threshold, rule.currency)}`;
    case 'scheduled': {
      const when =
        rule.frequency === 'daily'
          ? 'Every day'
          : rule.frequency === 'weekly'
            ? `Every ${weekdayName(rule.weekday)}`
            : `On the ${ordinal(rule.monthDay)} of every month`;
      return `${when} at ${rule.time}`;
    }
  }
}

/** The next time a scheduled rule fires, or null for the other modes. */
export function nextScheduledRun(rule: PayoutRule, now = Date.now()): number | null {
  if (rule.mode !== 'scheduled') return null;
  const [h, m] = rule.time.split(':').map(Number);
  const candidate = new Date(now);
  candidate.setHours(h, m, 0, 0);

  for (let i = 0; i < 62; i++) {
    const ok =
      rule.frequency === 'daily' ||
      (rule.frequency === 'weekly' && candidate.getDay() === rule.weekday) ||
      (rule.frequency === 'monthly' && candidate.getDate() === rule.monthDay);
    if (ok && candidate.getTime() > now) return candidate.getTime();
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(h, m, 0, 0);
  }
  return null;
}

export const formatNextRun = (t: number) => `${weekdayFmt.format(t)} at ${formatTime(t)}`;

/** formatRelative for mid-sentence use: "yesterday", "just now" — but dates keep their capitals. */
export function formatRelativeInline(t: number | null, now = Date.now()): string {
  const s = formatRelative(t, now);
  return /^(Just|Yesterday|Never)/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}
