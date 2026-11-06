import { useState } from 'react';

const STORE = 'symbion.counter.keys';

function read(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORE) ?? '{}');
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

// The merchant keys typed in, kept for this tab only; fallback is the demo key
export function useCounterKey(merchantId: string, fallback = '') {
  const [keys, setKeys] = useState(read);
  function set(value: string) {
    const next = { ...keys, [merchantId]: value };
    setKeys(next);
    try {
      sessionStorage.setItem(STORE, JSON.stringify(next));
    } catch {
      // storage blocked: the key lives in memory
    }
  }
  return [keys[merchantId] ?? fallback, set] as const;
}
