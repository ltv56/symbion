import { formatPoints } from '@/lib/format';

// A balance change carries its sign
export function formatSigned(value: number, locale: string): string {
  const sign = value < 0 ? '−' : '+';
  return `${sign}${formatPoints(Math.abs(value), locale)}`;
}
