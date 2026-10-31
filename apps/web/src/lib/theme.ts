import { useSyncExternalStore } from 'react';

const KEY = 'theme';
const listeners = new Set<() => void>();

function initialDark(): boolean {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return stored === 'dark';
  } catch {
    // storage can be blocked
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

let dark = initialDark();
// Runs on import, before the first render
document.documentElement.classList.toggle('dark', dark);

export function toggleDark() {
  dark = !dark;
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
  } catch {
    // storage can be blocked
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDark(): boolean {
  return useSyncExternalStore(subscribe, () => dark);
}
