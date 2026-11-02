import { cn } from 'cn';
import type { ReactNode } from 'react';

// One row of a facts list: the label and its value
export function Fact({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'ml-auto max-w-full text-right wrap-anywhere',
          mono && 'font-mono tabular-nums',
        )}
      >
        {children}
      </dd>
    </div>
  );
}
