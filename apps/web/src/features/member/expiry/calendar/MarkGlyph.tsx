import { useTranslation } from 'react-i18next';
import type { Mark } from '../marks';
import { SandHourglass } from './SandHourglass';
import { VoucherMark } from './VoucherMark';

// The hourglass for points, the ticket for a code
export function MarkGlyph({
  mark,
  lit,
  className,
}: {
  mark: Mark;
  lit: boolean;
  className?: string;
}) {
  return mark.kind === 'points' ? (
    <SandHourglass lit={lit} className={className} />
  ) : (
    <VoucherMark lit={lit} className={className} />
  );
}

// "2 khoản điểm, 1 mã" for a screen reader
export function useMarkSummary() {
  const { t } = useTranslation();
  return (marks: Mark[]): string => {
    const points = marks.filter((mark) => mark.kind === 'points').length;
    const codes = marks.length - points;
    const parts = [
      points > 0 ? t('timeline.markPoints', { count: points }) : null,
      codes > 0 ? t('timeline.markCodes', { count: codes }) : null,
    ].filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join(', ') : t('timeline.markNone');
  };
}
