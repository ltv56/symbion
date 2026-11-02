import { useState } from 'react';

// Open state plus a key that changes on every open: a dialog keyed by it starts fresh
export function useDialog() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  return {
    open,
    session,
    show: () => {
      setSession((n) => n + 1);
      setOpen(true);
    },
    close: () => setOpen(false),
  };
}
