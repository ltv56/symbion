import { useTranslation } from 'react-i18next';
import { DAY_MS, EXPIRING_SOON_DAYS } from '@/features/member/expiry/expiry';
import { formatPoints } from '@/lib/format';
import type { Voucher } from './useVouchers';

// Days to validUntil, only inside the soon window
function soonDays(voucher: Voucher, loadedAt: number): number | null {
  const days = Math.max(
    1,
    Math.ceil((new Date(voucher.validUntil).getTime() - loadedAt) / DAY_MS),
  );
  return days <= EXPIRING_SOON_DAYS ? days : null;
}

// The merchant, and the days left only when it is close
export function Meta({
  voucher,
  loadedAt,
}: {
  voucher: Voucher;
  loadedAt: number;
}) {
  const { t } = useTranslation();
  const days = soonDays(voucher, loadedAt);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
      <span
        title={voucher.merchantName}
        className="line-clamp-2 min-w-0 wrap-anywhere"
      >
        {voucher.merchantName}
      </span>
      {days !== null && (
        <span className="font-semibold whitespace-nowrap">
          {t('vouchers.left', { count: days })}
        </span>
      )}
    </p>
  );
}

// The price for a screen reader, right after the title
export function PriceSpoken({ points }: { points: number }) {
  const { t, i18n } = useTranslation();
  return (
    <span className="sr-only">
      {formatPoints(points, i18n.language)}{' '}
      {t('vouchers.unit', { count: points })}
    </span>
  );
}

// The price in points, the unit under it
export function Price({ points, struck }: { points: number; struck: boolean }) {
  const { t, i18n } = useTranslation();
  const text = formatPoints(points, i18n.language);
  return (
    <span
      aria-hidden
      className="flex shrink-0 flex-col items-center leading-tight"
    >
      <span
        className={`font-mono tabular-nums ${text.length > 9 ? 'text-sm' : 'text-base @max-[17.5rem]:text-sm'} ${struck ? 'line-through decoration-2' : ''}`}
      >
        {text}
      </span>
      <span className="text-xs text-muted-foreground">
        {t('vouchers.unit', { count: points })}
      </span>
    </span>
  );
}
