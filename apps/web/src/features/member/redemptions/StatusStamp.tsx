import { cn } from 'cn';
import { useTranslation } from 'react-i18next';
import { RubberStamp } from '@/components/RubberStamp';
import type { RedemptionStatus } from './useRedemptions';

// A used or expired code carries a stamp; an unused one has none
export function StatusStamp({ status }: { status: RedemptionStatus }) {
  const { t } = useTranslation();
  if (status === 'issued') return null;
  return (
    <RubberStamp
      size="sm"
      rotate={status === 'used' ? -6 : 5}
      animate={false}
      className={cn(
        status === 'expired' &&
          'text-muted-foreground/[88%] dark:text-muted-foreground/70',
      )}
    >
      {status === 'used'
        ? t('redemptions.stampUsed')
        : t('redemptions.stampExpired')}
    </RubberStamp>
  );
}
