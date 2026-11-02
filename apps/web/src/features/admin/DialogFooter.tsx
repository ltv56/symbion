import type { ReactNode } from 'react';

// Sunken, sticks to the bottom while the body scrolls
export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 rounded-b-lg border-t bg-muted p-4 sm:flex-row sm:justify-end">
      {children}
    </footer>
  );
}
