import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormError } from '@/components/FormError';
import { ShowMore } from '@/components/ShowMore';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/features/member/vouchers/useFavorites';
import { useVouchers } from '@/features/member/vouchers/useVouchers';
import { VoucherTicket } from '@/features/member/vouchers/VoucherTicket';
import { useVoucherActions } from '../vouchers/useVoucherActions';

// Tickets shown before "See all"
const SHOWN = 2;

// The vouchers the member has hearted, newest first
export function FavoritesSection({ balance }: { balance: number }) {
  const { t } = useTranslation();
  const favorites = useFavorites(true);
  const vouchers = useVouchers();
  const [expanded, setExpanded] = useState(false);
  const actions = useVoucherActions(vouchers.data ?? [], balance);

  const ready = favorites.data !== undefined && vouchers.data !== undefined;
  const items = ready
    ? [...favorites.data].flatMap((id) => {
        const voucher = vouchers.data.find((candidate) => candidate.id === id);
        return voucher ? [voucher] : [];
      })
    : [];
  const shown = expanded ? items : items.slice(0, SHOWN);
  const failed =
    (favorites.isError && favorites.data === undefined) ||
    (vouchers.isError && vouchers.data === undefined);

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">
        {t('personal.favoritesTitle')}
      </h2>
      {!ready && !failed && (
        <div role="status" className="space-y-3">
          <span className="sr-only">{t('member.loading')}</span>
          <div className="h-24 animate-pulse rounded-lg bg-foreground/10" />
        </div>
      )}
      {failed && (
        <div data-surface="ground" className="space-y-3">
          <FormError>{t('errors.generic')}</FormError>
          <Button
            onClick={() => {
              void favorites.refetch();
              void vouchers.refetch();
            }}
          >
            {t('member.retry')}
          </Button>
        </div>
      )}
      {ready && items.length === 0 && (
        <p data-surface="ground" className="text-sm text-muted-foreground">
          {t('personal.favoritesEmpty')}
        </p>
      )}
      {ready && items.length > 0 && (
        <>
          <ul className="space-y-3">
            {shown.map((voucher) => (
              <VoucherTicket
                key={voucher.id}
                voucher={voucher}
                balance={balance}
                loadedAt={vouchers.dataUpdatedAt}
                onOpen={actions.openDetail}
                onRedeem={actions.openRedeem}
              />
            ))}
          </ul>
          {items.length > SHOWN && (
            <div data-surface="ground">
              <ShowMore
                expanded={expanded}
                onToggle={() => setExpanded((value) => !value)}
                moreLabel={t('personal.favoritesAll', { n: items.length })}
                lessLabel={t('timeline.showLess')}
              />
            </div>
          )}
        </>
      )}
      {actions.dialogs}
    </section>
  );
}
