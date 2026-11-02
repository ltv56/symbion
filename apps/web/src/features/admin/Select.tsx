import { cn } from 'cn';
import type { ComponentProps } from 'react';

// A native select dressed like Input
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-field px-2 py-1 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 max-md:h-11 md:text-sm [&>option]:bg-background [&>option]:text-foreground',
        className,
      )}
      {...props}
    />
  );
}
