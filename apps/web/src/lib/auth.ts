import { useSyncExternalStore } from 'react';
import { queryClient } from './query';

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
    // storage can be blocked
  }
  listeners.forEach((listener) => listener());
}

// Clear the cache too
export function signOut() {
  setToken(null);
  queryClient.clear();
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
