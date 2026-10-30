import { useSyncExternalStore } from 'react';

const KEY = 'token';
const listeners = new Set<() => void>();

function readStored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

let token = readStored();

export function getToken(): string | null {
  return token;
}

export function setToken(next: string | null) {
  token = next;
  try {
    if (next) localStorage.setItem(KEY, next);
    else localStorage.removeItem(KEY);
  } catch {
    // storage can be blocked: the token then lasts until the page reloads
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useToken(): string | null {
  return useSyncExternalStore(subscribe, getToken);
}
