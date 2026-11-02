import { z } from 'zod';

export const MAX_STOCK = 4_294_967_295;

// Numbers are typed as text and parsed on submit
export const wholeNumber = (max: number, error: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,16}$/, { error })
    .refine((value) => Number(value) <= max, { error });

export const positiveNumber = (error: string) =>
  wholeNumber(Number.MAX_SAFE_INTEGER, error).refine(
    (value) => Number(value) >= 1,
    { error },
  );

// The value a datetime-local input takes, in local time
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
