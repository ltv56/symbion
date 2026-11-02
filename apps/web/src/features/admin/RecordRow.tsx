import { cn } from 'cn';
import type { ReactNode } from 'react';

// A row of the red half: pressing it chooses the record
export function RecordRow({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          'block w-full px-4 py-3 text-left outline-offset-[-3px] hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
          selected && 'bg-accent inset-ring-1 inset-ring-card-foreground',
        )}
      >
        {children}
      </button>
    </li>
  );
}
