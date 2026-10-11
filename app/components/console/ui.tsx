'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Check, Copy, Eye, EyeOff, Loader2, RotateCw, X } from 'lucide-react';

import { initials, titleCase } from '../../lib/console/format';
import { formatMajor, formatMinor } from '../../lib/console/money';
import type { Asset } from '../../lib/console/models';

/*
 * The console's building blocks. Everything takes its colour from the tokens
 * in globals.css (`bg-surface`, `text-ink-2`, `border-line`, …), so light and
 * dark are both just a change of variables — the same language as the sign-in
 * page: hairlines, quiet greys, one dark primary action.
 */

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
      <div className="min-w-0">
        <span aria-hidden className="block w-8 h-[3px] rounded-full bg-brand mb-4" />
        <h1 className="text-[1.75rem] sm:text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-ink-2 leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-xl border border-line bg-surface', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-ink hover:bg-brand-strong disabled:hover:bg-brand shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)]',
  dark: 'bg-ink text-canvas hover:bg-ink/85 disabled:hover:bg-ink',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-subtle',
  ghost: 'text-ink-2 hover:text-ink hover:bg-subtle',
  danger: 'bg-surface text-negative border border-line-strong hover:bg-negative/5',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-sm gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap cursor-pointer',
        'transition-[background-color,color,transform,opacity] duration-150 active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Field styling without a height, for controls that set their own. */
export const controlClass =
  'w-full px-3.5 rounded-lg bg-surface border border-line-strong text-base sm:text-sm text-ink ' +
  'placeholder:text-ink-3 outline-none focus:border-gold focus:ring-2 focus:ring-brand/30 ' +
  'disabled:bg-subtle disabled:text-ink-3 transition-colors';

export const inputClass = `${controlClass} h-11`;

export const labelClass = 'block text-sm font-medium text-ink-2 mb-2';

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-negative">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  size?: 'sm' | 'md';
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex p-0.5 rounded-lg bg-subtle border border-line', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'flex-1 rounded-md font-medium whitespace-nowrap cursor-pointer transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
              active
                ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08),inset_0_-2px_0_var(--color-brand)]'
                : 'text-ink-3 hover:text-ink'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data display                                                        */
/* ------------------------------------------------------------------ */

/**
 * An amount. Pass `minor` (a decimal string in minor units, straight from the
 * API) with `assets` so the right decimals are used, or `value` in whole units.
 */
export function Money({
  minor,
  value,
  asset,
  assets,
  sign,
  negative,
  compact,
  className,
}: {
  minor?: string | null;
  value?: number;
  asset: string;
  assets?: Asset[];
  sign?: boolean;
  negative?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const text =
    value !== undefined
      ? formatMajor(negative ? -value : value, asset, { sign, compact })
      : formatMinor(minor, asset, assets, { sign, compact, negative });
  return <span className={cx('tabular-nums tracking-tight', className)}>{text}</span>;
}

export type Tone = 'positive' | 'pending' | 'negative' | 'neutral' | 'info';

const TONE_STYLE: Record<Tone, { dot: string; text: string }> = {
  positive: { dot: 'bg-positive', text: 'text-positive' },
  pending: { dot: 'bg-pending', text: 'text-pending' },
  negative: { dot: 'bg-negative', text: 'text-negative' },
  neutral: { dot: 'bg-ink-3', text: 'text-ink-2' },
  info: { dot: 'bg-ink', text: 'text-ink' },
};

/** Any status as dot + word — invoices, disputes, subscriptions, webhooks. */
export function Pill({ tone, children, pulse }: { tone: Tone; children: React.ReactNode; pulse?: boolean }) {
  const s = TONE_STYLE[tone];
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap', s.text)}>
      <span aria-hidden className={cx('size-1.5 rounded-full', s.dot, pulse && 'animate-pulse')} />
      {children}
    </span>
  );
}

/** The API's status words, mapped to a tone. Unknown words are shown neutrally, never hidden. */
const STATUS_TONE: Record<string, Tone> = {
  completed: 'positive',
  confirmed: 'positive',
  settled: 'positive',
  successful: 'positive',
  succeeded: 'positive',
  delivered: 'positive',
  fulfilled: 'positive',
  active: 'positive',
  resolved: 'positive',
  won: 'positive',
  pending: 'pending',
  processing: 'pending',
  confirming: 'pending',
  initiated: 'pending',
  held: 'pending',
  pending_review: 'pending',
  under_review: 'pending',
  open: 'pending',
  retrying: 'pending',
  ready: 'pending',
  underpaid: 'pending',
  failed: 'negative',
  rejected: 'negative',
  reversed: 'negative',
  expired: 'neutral',
  exhausted: 'negative',
  frozen: 'negative',
  lost: 'negative',
  voided: 'neutral',
  cancelled: 'neutral',
  disabled: 'neutral',
};

const PULSING = new Set(['pending', 'processing', 'confirming', 'retrying']);

/** Status is always a word next to the dot — never colour alone. */
export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'neutral';
  return (
    <Pill tone={tone} pulse={PULSING.has(status)}>
      {titleCase(status)}
    </Pill>
  );
}

export function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'brand' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center h-6 px-2 rounded-md text-xs font-medium whitespace-nowrap',
        tone === 'brand'
          ? 'bg-gold-soft text-gold border border-brand/50'
          : 'bg-subtle text-ink-2 border border-line'
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-subtle border border-line text-ink-2 font-semibold',
        size === 'sm' && 'size-7 text-[10px]',
        size === 'md' && 'size-9 text-xs',
        size === 'lg' && 'size-12 text-sm'
      )}
    >
      {initials(name)}
    </span>
  );
}

/** The hairline definition rows from the sign-in page's brand panel. */
export function DetailList({ items }: { items: { term: string; detail: React.ReactNode }[] }) {
  return (
    <dl className="border-t border-line">
      {items.map(({ term, detail }) => (
        <div key={term} className="grid grid-cols-[8.5rem_1fr] gap-4 py-3 border-b border-line text-sm">
          <dt className="text-ink-3">{term}</dt>
          <dd className="text-ink min-w-0 break-words">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

/** Open overlays, innermost last — Escape only closes the top one. */
const overlayStack: object[] = [];

function useOverlay(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const token = {};
    overlayStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlayStack[overlayStack.length - 1] === token) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Focus the first field, or the panel itself, so keyboard users land inside.
    const first = panel.current?.querySelector<HTMLElement>('input, select, textarea, [data-autofocus]');
    (first ?? panel.current)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      overlayStack.splice(overlayStack.indexOf(token), 1);
      if (overlayStack.length === 0) document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);

  return panel;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  const panel = useOverlay(open, onClose);
  const titleId = useId();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] fx-fade-in" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative w-full bg-surface border border-line shadow-2xl outline-none fx-pop-in',
          'rounded-t-2xl sm:rounded-2xl max-h-[92svh] flex flex-col',
          width
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-ink-2 leading-relaxed">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 size-9 shrink-0 inline-flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-subtle cursor-pointer"
          >
            <X className="size-[18px]" />
          </button>
        </div>
        {children && <div className="px-6 pb-6 overflow-y-auto">{children}</div>}
        {footer && (
          <div className="px-6 py-4 border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  footer,
  width = 'max-w-md',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  /** Actions pinned to the bottom of the panel, e.g. Cancel / Continue. */
  footer?: React.ReactNode;
  width?: string;
  children: React.ReactNode;
}) {
  const panel = useOverlay(open, onClose);
  const titleId = useId();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 fx-fade-in" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative h-full w-full bg-surface border-l border-line shadow-2xl outline-none flex flex-col fx-slide-in',
          width
        )}
      >
        <div
          className={cx(
            'shrink-0 px-6 flex justify-between border-b border-line',
            description ? 'items-start gap-4 py-5' : 'h-16 items-center'
          )}
        >
          <div className="min-w-0">
            <h2 id={titleId} className="text-[15px] font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-ink-3 leading-relaxed">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 size-9 inline-flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-subtle cursor-pointer"
          >
            <X className="size-[18px]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-line bg-surface flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* More controls                                                       */
/* ------------------------------------------------------------------ */

/** Underlined section tabs, for pages with sub-views. */
export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-6 border-b border-line mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cx(
              'relative h-11 shrink-0 inline-flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer transition-colors',
              active ? 'text-ink font-medium' : 'text-ink-3 hover:text-ink'
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-subtle border border-line text-[11px] text-ink-2 inline-flex items-center justify-center">
                {t.count}
              </span>
            )}
            {active && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-brand rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        checked ? 'bg-brand' : 'bg-line-strong'
      )}
    >
      <span
        aria-hidden
        className={cx(
          'inline-block size-5 rounded-full shadow transition-transform duration-150',
          checked ? 'bg-brand-ink' : 'bg-surface',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

/** A row in a settings list: text on the left, a control on the right. */
export function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`${label}: ${value}`}
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="size-8 shrink-0 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-subtle cursor-pointer"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </button>
  );
}

/** Read-only monospaced value with copy — and optional reveal for secrets. */
export function CopyField({ value, secret }: { value: string; secret?: boolean }) {
  const [shown, setShown] = useState(!secret);
  const display = shown ? value : `${value.slice(0, 8)}${'•'.repeat(24)}`;
  return (
    <div className="flex items-center gap-1 h-11 pl-3.5 pr-1.5 rounded-lg border border-line bg-subtle">
      <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">{display}</code>
      {secret && (
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? 'Hide' : 'Reveal'}
          className="size-8 shrink-0 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-surface cursor-pointer"
        >
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )}
      <CopyButton value={value} />
    </div>
  );
}

/** A row of headline numbers inside one card, split by hairlines. */
export function StatStrip({ items }: { items: { label: string; value: React.ReactNode; hint?: React.ReactNode }[] }) {
  const four = items.length === 4;
  return (
    <Card className={cx('grid mb-6', four ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3')}>
      {items.map((s, i) => (
        <div
          key={s.label}
          className={cx(
            'p-5 border-line',
            four
              ? cx(i % 2 === 1 && 'border-l', i >= 2 && 'border-t lg:border-t-0', i === 2 && 'lg:border-l')
              : cx(i > 0 && 'border-t sm:border-t-0 sm:border-l')
          )}
        >
          <p className="text-xs text-ink-3">{s.label}</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-ink">{s.value}</p>
          {s.hint && <p className="mt-0.5 text-xs text-ink-3">{s.hint}</p>}
        </div>
      ))}
    </Card>
  );
}

export const textareaClass =
  'w-full px-3.5 py-3 rounded-lg bg-surface border border-line-strong text-base sm:text-sm text-ink placeholder:text-ink-3 ' +
  'outline-none focus:border-gold focus:ring-2 focus:ring-brand/30 transition-colors resize-y min-h-28';

/** A plain native select in the console's field style. */
export const selectClass = `${inputClass} cursor-pointer`;

/* ------------------------------------------------------------------ */
/* Loading & errors                                                    */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx('block rounded-md bg-subtle animate-pulse', className)} />;
}

/** Placeholder rows while a list loads. */
export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading" className="divide-y divide-line">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="size-9 rounded-full" />
          <span className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </span>
          <Skeleton className="h-4 w-20" />
        </li>
      ))}
    </ul>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="px-6 py-12 text-center">
      <AlertCircle className="mx-auto size-6 text-negative" />
      <p className="mt-3 text-sm font-medium text-ink">Couldn’t load this</p>
      <p className="mt-1 text-sm text-ink-3 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <Button size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw className="size-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

/** A button that shows a spinner while its async action runs, and can't be double-clicked. */
export function AsyncButton({
  onClick,
  children,
  ...rest
}: Omit<React.ComponentProps<typeof Button>, 'onClick'> & { onClick: () => Promise<unknown> | void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      {...rest}
      disabled={busy || rest.disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}
