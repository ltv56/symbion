import { cn } from 'cn';
import { useTranslation } from 'react-i18next';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import { Button } from '@/components/ui/button';
import { formatPoints } from '@/lib/format';
import { availability } from './availability';
import { Meta, Price, PriceSpoken } from './TicketParts';
import type { Voucher } from './useVouchers';

// Ticket: title opens the detail, Đổi on the stub of a ready one
export function VoucherTicket({
  voucher,
  balance,
  loadedAt,
  onOpen,
  onRedeem,
}: {
  voucher: Voucher;
  balance: number;
  loadedAt: number;
  onOpen: (voucher: Voucher) => void;
  onRedeem: (voucher: Voucher) => void;
}) {
  const { t, i18n } = useTranslation();
  const { kind } = availability(voucher, balance);
  const redeemable = kind === 'ok';
  const soldOut = kind === 'soldOut';
  const short = kind === 'short' || kind === 'negative';
  const missing = voucher.pointsPrice - balance;
  const edge = soldOut
    ? 'border-foreground/50 dark:border-foreground/40'
    : 'border-foreground/60 dark:border-foreground/40';
  const surface = redeemable ? undefined : 'ground';

  return (
    <li
      className={cn(
        '@container flex rounded-lg border-2',
        redeemable
          ? 'border-card bg-card text-card-foreground'
          : `${edge} text-foreground`,
        soldOut && 'border-dashed',
      )}
    >
      <div
        data-surface={surface}
        className="flex min-w-0 flex-1 items-start gap-3 p-3"
      >
        <span className={cn('shrink-0', soldOut && 'opacity-45 grayscale')}>
          <MerchantAvatar id={voucher.merchantId} name={voucher.merchantName} />
        </span>
        <div
          className={cn(
            'min-w-0 flex-1',
            soldOut &&
              '[&_button]:text-muted-foreground/[88%] [&_p]:text-muted-foreground/[88%] dark:[&_button]:text-muted-foreground/70 dark:[&_p]:text-muted-foreground/70',
          )}
        >
          {/* title 15px, 14px below 22rem, 13px below 17.5rem */}
          <button
            type="button"
            aria-haspopup="dialog"
            title={voucher.title}
            onClick={() => onOpen(voucher)}
            className="group/title relative block w-full text-left outline-offset-2 after:absolute after:inset-x-0 after:-inset-y-3 focus-visible:outline-2 focus-visible:outline-current"
          >
            <span className="line-clamp-3 text-[15px] leading-snug font-medium wrap-anywhere group-hover/title:underline group-focus-visible/title:underline @max-[22rem]:text-sm @max-[17.5rem]:text-[13px]">
              {voucher.title}
            </span>
          </button>
          <PriceSpoken points={voucher.pointsPrice} />
          <div className="@max-[22rem]:[&_p]:text-[13px] @max-[17.5rem]:[&_p]:text-xs">
            <Meta voucher={voucher} loadedAt={loadedAt} />
            {short && (
              <p className="mt-0.5 text-sm font-semibold wrap-anywhere">
                {t('vouchers.needMore', {
                  count: missing,
                  missing: formatPoints(missing, i18n.language),
                })}
              </p>
            )}
          </div>
        </div>
      </div>
      <div
        className={cn(
          'relative flex min-w-20 shrink-0 items-center justify-center border-l border-dashed px-2 py-3',
          redeemable ? 'border-border' : edge,
        )}
      >
        <div
          data-surface={surface}
          className={cn(
            'flex flex-col items-center gap-2',
            soldOut &&
              '[&_span]:text-muted-foreground/[88%] dark:[&_span]:text-muted-foreground/70',
          )}
        >
          <Price points={voucher.pointsPrice} struck={soldOut} />
          {redeemable && (
            <Button
              className="relative after:absolute after:-inset-1.5"
              aria-label={t('redeem.actionFor', { title: voucher.title })}
              onClick={() => onRedeem(voucher)}
            >
              {t('redeem.action')}
            </Button>
          )}
        </div>
        {/* notches on the perforation */}
        {redeemable ? (
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
