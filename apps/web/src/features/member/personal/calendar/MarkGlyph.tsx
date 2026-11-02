import { cn } from 'cn';
import { CircleArrowDown, CircleArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SandHourglass } from '../../expiry/calendar/SandHourglass';
import { VoucherMark } from '../../expiry/calendar/VoucherMark';
import type { Mark } from '../marks';

// Hourglass for points, ticket for a code, an arrow for an entry
export function MarkGlyph({
  mark,
  lit,
  className,
}: {
  mark: Mark;
  lit: boolean;
  className?: string;
}) {
  if (mark.kind === 'points') {
    return <SandHourglass lit={lit} className={className} />;
  }
  if (mark.kind === 'code') {
    return <VoucherMark lit={lit} className={className} />;
  }
  const Arrow = mark.flow === 'earn' ? CircleArrowUp : CircleArrowDown;
  return (
    <Arrow
      aria-hidden
      className={cn(
        'transition-colors duration-150 motion-reduce:transition-none',
        lit ? 'text-brand' : 'text-foreground',
        className,
      )}
    />
  );
}

// "2 earned, 1 spent" for a screen reader
export function useMarkSummary() {
  const { t } = useTranslation();
  return (marks: Mark[]): string => {
    const count = (match: (mark: Mark) => boolean) =>
      marks.filter(match).length;
    const parts = [
      [count((mark) => mark.kind === 'points'), 'timeline.markPoints'] as const,
      [count((mark) => mark.kind === 'code'), 'timeline.markCodes'] as const,
      [count((mark) => mark.flow === 'earn'), 'personal.markEarn'] as const,
      [count((mark) => mark.flow === 'spend'), 'personal.markSpend'] as const,
    ]
      .filter(([n]) => n > 0)
      .map(([n, key]) => t(key, { count: n }));
    return parts.length > 0 ? parts.join(', ') : t('timeline.markNone');
  };
}
