import { cn } from 'cn';
import { useTranslation } from 'react-i18next';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import { CodeCopy } from '@/features/member/redeem/CodeCopy';
import { DAY_MS } from '@/features/member/expiry/expiry';
import { formatDate, formatDateTime, formatPoints } from '@/lib/format';
import { StatusStamp } from './StatusStamp';
import type { MemberRedemption } from './useRedemptions';

// Days to the end of the code, only inside this window
const SOON_DAYS = 7;
const HOUR_MS = 3_600_000;

function Meta({
  item,
  loadedAt,
}: {
  item: MemberRedemption;
  loadedAt: number;
}) {
  const { t, i18n } = useTranslation();
  const date = (value: string) => formatDate(value, i18n.language);
  const msLeft = new Date(item.expiresAt).getTime() - loadedAt;
  const days = Math.max(1, Math.ceil(msLeft / DAY_MS));
  const hours = Math.max(1, Math.ceil(msLeft / HOUR_MS));
  return (
    <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
      <span className="wrap-anywhere">
        {item.status === 'issued' &&
          t('redemptions.validUntil', {
            date: formatDateTime(item.expiresAt, i18n.language),
          })}
        {item.status === 'used' &&
          t('redemptions.usedOn', {
            date: date(item.usedAt ?? item.createdAt),
          })}
        {item.status === 'expired' &&
          t('redemptions.expiredOn', { date: date(item.expiresAt) })}
      </span>
      {item.status === 'issued' && days <= SOON_DAYS && (
        <span className="font-semibold whitespace-nowrap">
          {msLeft < DAY_MS
            ? t('redemptions.leftHours', { count: hours })
            : t('redemptions.left', { count: days })}
        </span>
      )}
    </p>
  );
}

// Solid while the code can be used, an outline once used, gray dashed once expired
export function RedemptionTicket({
  item,
  loadedAt,
}: {
  item: MemberRedemption;
  loadedAt: number;
}) {
  const { t, i18n } = useTranslation();
  const issued = item.status === 'issued';
  const expired = item.status === 'expired';
  const edge = expired
    ? 'border-foreground/50 dark:border-foreground/40'
    : 'border-foreground/60 dark:border-foreground/40';
  const surface = issued ? undefined : 'ground';
  const price = formatPoints(item.points, i18n.language);
  const gray = 'text-muted-foreground/[88%] dark:text-muted-foreground/70';

  return (
    <li
      className={cn(
        '@container flex rounded-lg border-2',
        issued
          ? 'border-card bg-card text-card-foreground'
          : `${edge} text-foreground`,
        expired && 'border-dashed',
      )}
    >
      <div data-surface={surface} className="min-w-0 flex-1 p-3">
        <div className="flex items-start gap-3">
          <span className={cn('shrink-0', expired && 'opacity-45 grayscale')}>
            <MerchantAvatar id={item.merchantId} name={item.merchantName} />
          </span>
          <div
            className={cn(
              'min-w-0 flex-1',
              expired &&
                '[&_p]:text-muted-foreground/[88%] dark:[&_p]:text-muted-foreground/70',
            )}
          >
            <p
              title={item.voucherTitle}
              className="line-clamp-3 font-medium wrap-anywhere @max-[22rem]:text-[15px] @max-[22rem]:leading-snug"
            >
              {item.voucherTitle}
            </p>
            <p
              title={item.merchantName}
              className="line-clamp-2 text-sm text-muted-foreground wrap-anywhere"
            >
              {item.merchantName}
            </p>
          </div>
        </div>
        <div className={cn(expired && gray, '@max-[22rem]:[&_p]:text-[13px]')}>
          <CodeCopy code={item.code} copyable={issued} struck={expired} />
          {!issued && (
            <div className="mt-2">
              <StatusStamp status={item.status} />
            </div>
          )}
          <Meta item={item} loadedAt={loadedAt} />
        </div>
      </div>
      <div
        className={cn(
          'relative flex max-w-[45%] min-w-20 shrink-0 items-center justify-center border-l border-dashed px-2 py-3 @max-[22rem]:min-w-16',
          issued ? 'border-border' : edge,
        )}
      >
        <div
          data-surface={surface}
          className={cn(
            expired &&
              '[&_span]:text-muted-foreground/[88%] dark:[&_span]:text-muted-foreground/70',
          )}
        >
          <span className="sr-only">{t('redemptions.paid', { n: price })}</span>
          <span
            aria-hidden
            className="flex shrink-0 flex-col items-end leading-tight"
          >
            <span
              className={`font-mono font-semibold tabular-nums wrap-anywhere ${price.length > 9 ? 'text-sm' : 'text-base'}`}
            >
              −{price}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('vouchers.unit', { count: item.points })}
            </span>
          </span>
        </div>
        {issued ? (
          <>
            <span
              aria-hidden
              className="absolute -top-2.5 -left-2 size-4 rounded-full bg-background"
            />
            <span
              aria-hidden
              className="absolute -bottom-2.5 -left-2 size-4 rounded-full bg-background"
            />
          </>
        ) : (
          <>
            <span
              aria-hidden
              className={`absolute -top-0.5 -left-2 h-2 w-4 rounded-b-full border-2 border-t-0 bg-background ${edge}`}
            />
            <span
              aria-hidden
              className={`absolute -bottom-0.5 -left-2 h-2 w-4 rounded-t-full border-2 border-b-0 bg-background ${edge}`}
            />
          </>
        )}
      </div>
    </li>
  );
}
