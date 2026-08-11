'use client';

import React, { useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired once the last box is filled. */
  onComplete?: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  /** Screen-reader name for the group. */
  label: string;
}

/**
 * Segmented one-time-code entry. The value stays a plain compact string so
 * callers keep working with "123456"; the boxes are just a presentation of it.
 */
export default function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  autoFocus = false,
  invalid = false,
  disabled = false,
  label,
}: OtpInputProps) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (index: number) => {
    const target = boxes.current[Math.max(0, Math.min(index, length - 1))];
    target?.focus();
    target?.select();
  };

  const commit = (next: string) => {
    const trimmed = next.slice(0, length);
    onChange(trimmed);
    if (trimmed.length === length) onComplete?.(trimmed);
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');

    if (!digits) {
      commit(value.slice(0, index) + value.slice(index + 1));
      return;
    }

    // A paste or an SMS/authenticator autofill arrives as one long value.
    if (digits.length > 1) {
      const next = (value.slice(0, index) + digits).slice(0, length);
      commit(next);
      focusBox(next.length);
      return;
    }

    commit(value.slice(0, index) + digits + value.slice(index + 1));
    focusBox(index + 1);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      e.preventDefault();
      commit(value.slice(0, index - 1) + value.slice(index));
      focusBox(index - 1);
      return;
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusBox(index - 1);
      return;
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    e.preventDefault();
    const next = (value.slice(0, index) + digits).slice(0, length);
    commit(next);
    focusBox(next.length);
  };

  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            boxes.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          value={value[index] ?? ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.target.select()}
          className={`flex-1 min-w-0 max-w-14 h-13 py-3 rounded-lg border text-center font-mono text-lg font-semibold text-slate-900 dark:text-white bg-white dark:bg-[#141416] outline-none transition-colors disabled:opacity-50 ${
            invalid
              ? 'border-rose-400 dark:border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-300 dark:border-[#2a2a30] focus:border-slate-900 dark:focus:border-[#fed700] focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-[#fed700]/20'
          }`}
        />
      ))}
    </div>
  );
}
