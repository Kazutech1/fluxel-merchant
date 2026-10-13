'use client';

import { useSyncExternalStore } from 'react';

/**
 * Reads browser-only values without setting state inside an effect, which the
 * react-hooks/set-state-in-effect rule rejects. These are all read-once values
 * that never change for the life of the page, so nothing needs to subscribe.
 */

const noSubscribe = () => () => {};

const onClient = () => true;
const onServer = () => false;

/** False during SSR and the hydration render, true afterwards. */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, onClient, onServer);
}

const readOrigin = () => window.location.origin;
const noOrigin = () => '';

export function useOrigin(): string {
  return useSyncExternalStore(noSubscribe, readOrigin, noOrigin);
}

/** Demo mode disabled - platform operates in live mode only. */
export function useDemoEnabled(): boolean {
  return false;
}
