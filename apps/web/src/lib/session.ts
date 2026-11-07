import { useSyncExternalStore } from 'react';

// A token kept in memory and in localStorage under its own key
export function createSession(key: string) {
  const listeners = new Set<() => void>();

  function readStored(): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  let token = readStored();

  function get(): string | null {
    return token;
  }

  function set(next: string | null) {
    token = next;
    try {
      if (next) localStorage.setItem(key, next);
      else localStorage.removeItem(key);
    } catch {
      // storage can be blocked
    }
    listeners.forEach((listener) => listener());
  }

  // Another tab signed in or out
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== null && event.key !== key) return;
      token = readStored();
      listeners.forEach((listener) => listener());
    });
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function use(): string | null {
    return useSyncExternalStore(subscribe, get);
  }

  return { get, set, use };
}
