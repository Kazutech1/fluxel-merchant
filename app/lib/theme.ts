'use client';

import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'fluxel_theme';
const CHANGE_EVENT = 'fluxel:theme-changed';

/**
 * Theme as an external store rather than component state, so it is shared by
 * every route — including /pay, which is a separate React tree — and stays in
 * sync across tabs. First paint is handled by the bootstrap script in
 * layout.tsx; this only keeps React in step with it.
 */

function getSnapshot(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

function getServerSnapshot(): Theme {
  return 'dark';
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function toggleTheme(current: Theme): void {
  setTheme(current === 'dark' ? 'light' : 'dark');
}
