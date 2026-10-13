/** Dates and small text helpers for the console. Money lives in `money.ts`. */

export const DAY_MS = 86_400_000;

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

/** API timestamps are RFC 3339 strings or null; numbers are ms. */
export function toMs(t: string | number | null | undefined): number | null {
  if (t === null || t === undefined || t === '') return null;
  const ms = typeof t === 'number' ? t : Date.parse(t);
  return Number.isFinite(ms) ? ms : null;
}

export function formatDate(t: string | number | null | undefined): string {
  const ms = toMs(t);
  return ms === null ? '—' : dateFmt.format(ms);
}

export function formatShortDate(t: string | number | null | undefined): string {
  const ms = toMs(t);
  return ms === null ? '—' : shortDateFmt.format(ms);
}

export function formatDateTime(t: string | number | null | undefined): string {
  const ms = toMs(t);
  return ms === null ? '—' : `${dateFmt.format(ms)}, ${timeFmt.format(ms)}`;
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "Today, 14:02" · "Yesterday, 09:15" · "3 Oct, 11:40" */
export function formatWhen(t: string | number | null | undefined, now = Date.now()): string {
  const ms = toMs(t);
  if (ms === null) return '—';
  const today = startOfDay(now);
  if (ms >= today) return `Today, ${timeFmt.format(ms)}`;
  if (ms >= today - DAY_MS) return `Yesterday, ${timeFmt.format(ms)}`;
  return `${shortDateFmt.format(ms)}, ${timeFmt.format(ms)}`;
}

/** "in 3 days" / "5 min ago" style, for expiries and sessions. */
export function formatRelative(t: string | number | null | undefined, now = Date.now()): string {
  const ms = toMs(t);
  if (ms === null) return '—';
  const diff = ms - now;
  const future = diff > 0;
  const mins = Math.round(Math.abs(diff) / 60_000);
  const say = (n: number, unit: string) => (future ? `in ${n} ${unit}${n === 1 ? '' : 's'}` : `${n} ${unit}${n === 1 ? '' : 's'} ago`);
  if (mins < 2) return future ? 'in a moment' : 'just now';
  if (mins < 60) return say(mins, 'minute');
  const hours = Math.round(mins / 60);
  if (hours < 24) return say(hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return say(days, 'day');
  return formatDate(ms);
}

export function initials(name: string): string {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

export function shortId(id: string, keep = 6): string {
  return id.length > keep * 2 + 1 ? `${id.slice(0, keep)}…${id.slice(-4)}` : id;
}

export function maskAccount(accountNumber: string): string {
  return `••${accountNumber.slice(-4)}`;
}

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
