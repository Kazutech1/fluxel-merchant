'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { useIsHydrated } from '../../lib/clientEnv';

function format(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Time left on a one-time account or address, as a single quiet line. */
export default function ExpiryBar({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const hydrated = useIsHydrated();
  const [now, setNow] = useState(() => Date.now());
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
  const left = Number.isFinite(target) ? Math.max(target - now, 0) : 0;
  const urgent = hydrated && left < 5 * 60 * 1000;

  return (
    <p className={`flex items-center justify-center gap-1.5 text-xs ${urgent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
      <Clock className="size-3.5" />
      Expires in <span className="font-mono tabular-nums font-medium">{hydrated ? format(left) : '--:--'}</span>
    </p>
  );
}
