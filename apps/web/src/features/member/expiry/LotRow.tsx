import { useTranslation } from 'react-i18next';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import { formatDate, formatPoints } from '@/lib/format';
import { daysOf } from './expiry';
import type { Lot } from './useLots';

// The days left
function DaysText({ lot, loadedAt }: { lot: Lot; loadedAt: number }) {
  const { t } = useTranslation();
  const days = daysOf(lot, loadedAt);
  if (days === null) return null;
  return (
    <span className="font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums">
      {t('timeline.left', { count: days })}
    </span>
  );
}

// Remaining points, the unit under them
function Points({ value }: { value: number }) {
  const { t, i18n } = useTranslation();
  return (
    <span className="flex shrink-0 flex-col items-end leading-tight">
      <span className="font-mono text-base tabular-nums">
        {formatPoints(value, i18n.language)}
      </span>
      <span className="text-xs text-muted-foreground">
        {t('timeline.unit', { count: value })}
      </span>
    </span>
  );
}

// One item: avatar, name, date and days, points on the right
export function LotRow({ lot, loadedAt }: { lot: Lot; loadedAt: number }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex items-center gap-3 py-3">
      <MerchantAvatar id={lot.merchantId} name={lot.merchantName} />
      <div className="@container min-w-0 flex-1">
        {/* two lines at most, then "…" */}
        <p
          title={lot.merchantName}
          className="line-clamp-2 font-medium wrap-anywhere @max-[14rem]:text-[15px] @max-[14rem]:leading-tight"
        >
          {lot.merchantName}
        </p>
        <p className="text-sm text-muted-foreground @max-[12rem]:flex @max-[12rem]:flex-col @max-[14rem]:text-[13px]">
          {lot.expiresAt
            ? formatDate(lot.expiresAt, i18n.language)
            : t('timeline.noExpiry')}
          {lot.expiresAt && (
            <>
              <span className="@max-[12rem]:hidden">{' · '}</span>
              <DaysText lot={lot} loadedAt={loadedAt} />
            </>
          )}
        </p>
      </div>
      <Points value={lot.remaining} />
    </div>
  );
}
