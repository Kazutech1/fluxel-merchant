'use client';

import { useEffect, useState } from 'react';

/** "Now", refreshed every minute — so 30-day windows and "next payout" times roll forward on their own. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
