import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormError } from '@/components/FormError';
import type { PanelQueryState } from '@/components/PanelQuery';
import { Button } from '@/components/ui/button';
import {
  FALLBACK_FOCUS_ID,
  RedeemDialog,
} from '@/features/member/redeem/RedeemDialog';
import { AllVouchersDialog } from './AllVouchers';
import { groupVouchers } from './availability';
import type { VoucherFilter, VoucherGroups } from './availability';
import { GroupSections } from './GroupSections';
import { useVouchers } from './useVouchers';
import type { Voucher } from './useVouchers';
import { VoucherDetailDialog } from './VoucherDetail';

// Tickets shown per group
const SHOWN: Record<keyof VoucherGroups, number> = {
  ready: 4,
  notYet: 3,
  soldOut: 2,
};

// Return focus to the opener
function useReturnFocus() {
  const from = useRef<Element | null>(null);
  return {
    remember: () => {
      from.current = document.activeElement;
    },
    restore: () => {
      const element = from.current;
      if (element instanceof HTMLElement && element.isConnected) {
        element.focus();
      }
    },
  };
}

// Groups and their pages
function Groups({
  vouchers,
  balance,
  loadedAt,
}: {
  vouchers: Voucher[];
  balance: number;
  loadedAt: number;
}) {
  // Filter set = all vouchers page open
  const [filter, setFilter] = useState<VoucherFilter | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [redeem, setRedeem] = useState<Voucher | null>(null);
  const pageFocus = useReturnFocus();
  const detailFocus = useReturnFocus();

  const groups = groupVouchers(vouchers, balance);
  const shown: VoucherGroups = {
    ready: groups.ready.slice(0, SHOWN.ready),
    notYet: groups.notYet.slice(0, SHOWN.notYet),
    soldOut: groups.soldOut.slice(0, SHOWN.soldOut),
  };
  const detail = vouchers.find((voucher) => voucher.id === detailId) ?? null;

  const openDetail = (voucher: Voucher) => {
    detailFocus.remember();
    setDetailId(voucher.id);
  };

  return (
    <>
      <GroupSections
        shown={shown}
        totals={groups}
        balance={balance}
        loadedAt={loadedAt}
        onOpen={openDetail}
        onRedeem={setRedeem}
        onMore={(key) => {
          pageFocus.remember();
          setFilter(key);
        }}
      />
      <AllVouchersDialog
        open={filter !== null}
        initialFilter={filter ?? 'all'}
        onClose={() => setFilter(null)}
        onCloseFocus={pageFocus.restore}
        groups={groups}
        balance={balance}
        loadedAt={loadedAt}
        onOpen={openDetail}
        onRedeem={setRedeem}
      />
      <VoucherDetailDialog
        voucher={detail}
        balance={balance}
        onClose={() => setDetailId(null)}
        onCloseFocus={detailFocus.restore}
        onRedeem={setRedeem}
      />
      <RedeemDialog
        voucher={redeem}
        balance={balance}
        onClose={() => setRedeem(null)}
      />
    </>
  );
}

// List on a query result
export function VoucherListView({
  query,
  balance,
}: {
  query: PanelQueryState<Voucher[]>;
  balance: number;
}) {
  const { t } = useTranslation();

  return (
    <section>
      <h2
        id={FALLBACK_FOCUS_ID}
        tabIndex={-1}
        className="mb-3 text-base font-semibold outline-none"
      >
        {t('vouchers.title')}
      </h2>
      {query.isPending && (
        <div role="status" className="space-y-3">
          <span className="sr-only">{t('member.loading')}</span>
          <div className="h-24 animate-pulse rounded-lg bg-foreground/10" />
          <div className="h-24 animate-pulse rounded-lg bg-foreground/10" />
        </div>
      )}
      {query.isError && query.data === undefined && (
        <div data-surface="ground" className="space-y-3">
          <FormError>{t('errors.generic')}</FormError>
          <Button onClick={() => void query.refetch()}>
            {t('member.retry')}
          </Button>
        </div>
      )}
      {query.data !== undefined &&
        (query.data.length === 0 ? (
          <p data-surface="ground" className="text-sm text-muted-foreground">
            {t('vouchers.empty')}
          </p>
        ) : (
          <Groups
            vouchers={query.data}
            balance={balance}
            loadedAt={query.dataUpdatedAt}
          />
        ))}
    </section>
  );
}

export function VoucherList({ balance }: { balance: number }) {
  const vouchers = useVouchers();
  return <VoucherListView query={vouchers} balance={balance} />;
}
