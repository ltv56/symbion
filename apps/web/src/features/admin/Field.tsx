import type { ReactNode } from 'react';
import { FormError } from '@/components/FormError';

// Label, the control, a hint and its error; the control carries the aria wiring
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && <FormError id={`${id}-error`}>{error}</FormError>}
    </div>
  );
}
