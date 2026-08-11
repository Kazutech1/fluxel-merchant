'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { useIsHydrated } from '../../lib/clientEnv';

interface CountdownProps {
  /** ISO-8601 expiry timestamp. */
  expiresAt: string;
  onExpire?: () => void;
}

function format(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function Countdown({ expiresAt, onExpire }: CountdownProps) {
  const hydrated = useIsHydrated();
  const [now, setNow] = useState(() => Date.now());

  // Kept in a ref so a new callback identity from the parent doesn't restart
  // the interval mid-countdown.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    const target = new Date(expiresAt).getTime();

    const timer = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (target - tick <= 0) {
        clearInterval(timer);
        onExpireRef.current?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const target = new Date(expiresAt).getTime();
  const ms = Number.isFinite(target) ? Math.max(target - now, 0) : 0;
  const urgent = hydrated && ms > 0 && ms < 5 * 60 * 1000;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium tabular-nums ${
        urgent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>
        Expires in <span className="font-mono">{hydrated ? format(ms) : '--:--'}</span>
      </span>
    </span>
  );
}
