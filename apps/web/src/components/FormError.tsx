import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

// Icon + words: an error is never colour alone
export function FormError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-2 text-sm font-semibold text-destructive"
    >
      <CircleAlert className="mt-px size-4.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
