import { useTranslation } from 'react-i18next';
import { RubberStamp } from '@/components/RubberStamp';
import { formatPoints } from '@/lib/format';
import { RecordRow } from '../RecordRow';
import type { AdminVoucher } from './useVouchers';
import { voucherState } from './voucherState';

export function VoucherRow({
  voucher,
  now,
  selected,
  onSelect,
}: {
  voucher: AdminVoucher;
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t, i18n } = useTranslation();
  const state = voucherState(voucher, now);
  return (
    <RecordRow selected={selected} onSelect={onSelect}>
      <span className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <span className="min-w-0 flex-1 basis-32">
          <span
            className="line-clamp-2 font-medium wrap-anywhere"
            title={voucher.title}
          >
            {voucher.title}
          </span>
          <span
            className="line-clamp-1 text-[13px] text-muted-foreground wrap-anywhere"
            title={voucher.merchantName}
          >
            {voucher.merchantName}
          </span>
          <span className="block text-[13px] text-muted-foreground wrap-anywhere">
            {t('admin.vouchers.row.stock', {
              stock: formatPoints(voucher.stock, i18n.language),
              redeemed: formatPoints(voucher.redeemedCount, i18n.language),
            })}
          </span>
        </span>
        <span className="flex max-w-full shrink-0 flex-col items-end gap-2">
          <span className="font-mono text-base font-medium tabular-nums wrap-anywhere">
            {t('admin.vouchers.row.price', {
              points: formatPoints(voucher.pointsPrice, i18n.language),
            })}
          </span>
          {state !== 'live' && (
            <RubberStamp size="sm" rotate={-4} animate={false}>
              {t(`admin.vouchers.state.${state}`)}
            </RubberStamp>
          )}
        </span>
      </span>
    </RecordRow>
  );
}
