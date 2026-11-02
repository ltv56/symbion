import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VoucherGroups } from './availability';
import { VoucherTicket } from './VoucherTicket';
import type { Voucher } from './useVouchers';

export const GROUPS: { key: keyof VoucherGroups; label: string }[] = [
  { key: 'ready', label: 'vouchers.groupReadyToRedeem' },
  { key: 'notYet', label: 'vouchers.groupShort' },
  { key: 'soldOut', label: 'vouchers.groupSoldOut' },
];

// Groups, See more on the heading row
export function GroupSections({
  shown,
  totals,
  balance,
  loadedAt,
  headings = true,
  onOpen,
  onRedeem,
  onMore,
}: {
  shown: VoucherGroups;
  totals: VoucherGroups;
  balance: number;
  loadedAt: number;
  headings?: boolean;
  onOpen: (voucher: Voucher) => void;
  onRedeem: (voucher: Voucher) => void;
  onMore?: (key: keyof VoucherGroups) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      {GROUPS.map(({ key, label }) => {
        if (shown[key].length === 0) return null;
        const name = t(label);
        const more = onMore && totals[key].length > shown[key].length;
        return (
          <section key={key}>
            {headings && (
              <div
                data-surface="ground"
                className="mb-2 flex items-center justify-between gap-3"
              >
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {t('vouchers.groupTitle', {
                    name,
                    count: totals[key].length,
                  })}
                </h3>
                {more && (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={t('vouchers.moreFor', { name })}
                    onClick={() => onMore(key)}
                    className="-my-3 flex min-h-11 shrink-0 items-center gap-0.5 rounded-lg text-sm font-medium underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-current"
                  >
                    {t('vouchers.more')}
                    <ChevronRight aria-hidden className="size-4" />
                  </button>
                )}
              </div>
            )}
            <ul className="space-y-3">
              {shown[key].map((voucher) => (
                <VoucherTicket
                  key={voucher.id}
                  voucher={voucher}
                  balance={balance}
                  loadedAt={loadedAt}
                  onOpen={onOpen}
                  onRedeem={onRedeem}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
