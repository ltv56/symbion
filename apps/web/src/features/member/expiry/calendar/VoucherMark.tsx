import { cn } from 'cn';
import { Ticket } from 'lucide-react';

// A code's end on the calendar
export function VoucherMark({
  lit,
  className,
}: {
  lit: boolean;
  className?: string;
}) {
  return (
    <Ticket
      aria-hidden
      className={cn(
        lit
          ? 'fill-current text-brand [&>path:nth-child(n+2)]:stroke-background'
          : 'text-foreground transition-colors duration-150 motion-reduce:transition-none',
        className,
      )}
    />
  );
}
