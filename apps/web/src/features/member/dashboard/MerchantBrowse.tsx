import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import type { MerchantFilter } from '../vouchers/AllVouchers';
import type { VoucherGroups } from '../vouchers/availability';
import type { Voucher } from '../vouchers/useVouchers';

// Merchants shown before "See all"
const SHOWN = 5;

export interface MerchantCard {
  id: number;
  name: string;
  address: string | null;
  ready: number;
  total: number;
}

// One card per merchant that has vouchers, most redeemable first
export function cardsOf(
  vouchers: Voucher[],
  groups: VoucherGroups,
): MerchantCard[] {
  const cards = new Map<number, MerchantCard>();
  for (const voucher of vouchers) {
    const card = cards.get(voucher.merchantId) ?? {
      id: voucher.merchantId,
      name: voucher.merchantName,
      address: voucher.merchantAddress,
      ready: 0,
      total: 0,
    };
    card.total += 1;
    card.address ??= voucher.merchantAddress;
    cards.set(voucher.merchantId, card);
  }
  for (const voucher of groups.ready) {
    const card = cards.get(voucher.merchantId);
    if (card) card.ready += 1;
  }
  return [...cards.values()].sort(
    (a, b) =>
      b.ready - a.ready || b.total - a.total || a.name.localeCompare(b.name),
  );
}

// Merchants to browse; a press opens their vouchers
export function MerchantBrowse({
  cards,
  partnerCount,
  onPick,
  onSeeAll,
}: {
  cards: MerchantCard[];
  partnerCount: number;
  onPick: (merchant: MerchantFilter) => void;
  onSeeAll: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">
          {t('dashboard.merchantsTitle')}
        </h2>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onSeeAll}
          data-surface="ground"
          className="-my-3 flex min-h-11 shrink-0 items-center gap-0.5 rounded-lg text-sm font-medium underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-current"
        >
          {t('dashboard.merchantsAll', { count: partnerCount })}
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>
      <ul data-surface="ground" className="divide-y divide-border">
        {cards.slice(0, SHOWN).map((card) => (
          <li key={card.id}>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => onPick({ id: card.id, name: card.name })}
              className="-mx-2 flex min-h-16 w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors outline-offset-2 hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-current motion-reduce:transition-none"
            >
              <MerchantAvatar id={card.id} name={card.name} />
              <span className="min-w-0 flex-1">
                <span
                  title={card.name}
                  className="line-clamp-2 block font-medium wrap-anywhere"
                >
                  {card.name}
                </span>
                {card.address && (
                  <span
                    title={card.address}
                    className="line-clamp-1 block text-sm text-muted-foreground wrap-anywhere"
                  >
                    {card.address}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-0.5 text-sm">
                <span
                  className={
                    card.ready > 0
                      ? 'font-medium tabular-nums'
                      : 'text-muted-foreground tabular-nums'
                  }
                >
                  {card.ready > 0
                    ? t('dashboard.merchantReady', { count: card.ready })
                    : t('dashboard.merchantTotal', { count: card.total })}
                </span>
                <ChevronRight aria-hidden className="size-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
