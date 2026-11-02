import { cn } from 'cn';
import { ArrowLeft, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useState } from 'react';
import type { ElementType } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogPortal } from '@/components/ui/dialog';
import type { VoucherFilter, VoucherGroups } from './availability';
import { GROUPS, GroupSections } from './GroupSections';
import type { Voucher } from './useVouchers';

const EMPTY: VoucherGroups = { ready: [], notYet: [], soldOut: [] };

export interface MerchantFilter {
  id: number;
  name: string;
}

function ofMerchant(groups: VoucherGroups, id: number): VoucherGroups {
  return {
    ready: groups.ready.filter((voucher) => voucher.merchantId === id),
    notYet: groups.notYet.filter((voucher) => voucher.merchantId === id),
    soldOut: groups.soldOut.filter((voucher) => voucher.merchantId === id),
  };
}

// All vouchers page, optionally for one merchant
export function AllVouchersView({
  groups: everything,
  merchant = null,
  balance,
  loadedAt,
  initialFilter = 'all',
  onClose,
  onClearMerchant,
  onOpen,
  onRedeem,
  Title = 'h2',
}: {
  groups: VoucherGroups;
  merchant?: MerchantFilter | null;
  balance: number;
  loadedAt: number;
  // Group opened from
  initialFilter?: VoucherFilter;
  onClose: () => void;
  onClearMerchant?: () => void;
  onOpen: (voucher: Voucher) => void;
  onRedeem: (voucher: Voucher) => void;
  // DialogTitle in the dialog
  Title?: ElementType;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<VoucherFilter>(initialFilter);
  const groups = merchant ? ofMerchant(everything, merchant.id) : everything;
  const total =
    groups.ready.length + groups.notYet.length + groups.soldOut.length;
  const options: { key: VoucherFilter; label: string; count: number }[] = [
    { key: 'all', label: t('vouchers.filterAll'), count: total },
    ...GROUPS.filter(({ key }) => groups[key].length > 0).map(
      ({ key, label }) => ({ key, label: t(label), count: groups[key].length }),
    ),
  ];
  // A group that is empty for this merchant falls back to all
  const active = options.some(({ key }) => key === filter) ? filter : 'all';
  const shown =
    active === 'all' ? groups : { ...EMPTY, [active]: groups[active] };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 flex items-center gap-1 border-b border-foreground/15 bg-background px-2 py-1">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-foreground/10"
          aria-label={t('vouchers.back')}
          onClick={onClose}
        >
          <ArrowLeft />
        </Button>
        <Title className="text-base font-semibold">
          {t('vouchers.allTitle')}
        </Title>
      </div>
      {merchant && onClearMerchant && (
        <div
          data-surface="ground"
          className="flex items-center justify-between gap-1 rounded-lg border border-foreground/25 pl-3"
        >
          <p className="line-clamp-2 min-w-0 py-1 text-sm font-medium wrap-anywhere">
            {t('dashboard.filterMerchant', { name: merchant.name })}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-foreground/10"
            onClick={onClearMerchant}
          >
            <X aria-hidden />
            <span className="sr-only">{t('dashboard.clearMerchant')}</span>
          </Button>
        </div>
      )}
      {options.length > 2 && (
        <div
          role="group"
          data-surface="ground"
          aria-label={t('vouchers.filter')}
          className="flex flex-wrap gap-x-4"
        >
          {options.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              aria-pressed={active === key}
              onClick={() => setFilter(key)}
              className="flex min-h-11 items-center text-sm font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-current"
            >
              <span
                className={cn(
                  'border-b-2 py-0.5 tabular-nums',
                  active === key
                    ? 'border-current'
                    : 'border-transparent text-muted-foreground',
                )}
              >
                {t('vouchers.groupTitle', { name: label, count })}
              </span>
            </button>
          ))}
        </div>
      )}
      {total === 0 ? (
        <p data-surface="ground" className="text-sm text-muted-foreground">
          {t('dashboard.merchantEmpty')}
        </p>
      ) : (
        <GroupSections
          shown={shown}
          totals={groups}
          balance={balance}
          loadedAt={loadedAt}
          headings={active === 'all'}
          onOpen={onOpen}
          onRedeem={onRedeem}
        />
      )}
    </div>
  );
}

export function AllVouchersDialog({
  open,
  onClose,
  onCloseFocus,
  ...rest
}: {
  open: boolean;
  onClose: () => void;
  // Focus target on close
  onCloseFocus: () => void;
  groups: VoucherGroups;
  merchant?: MerchantFilter | null;
  balance: number;
  loadedAt: number;
  initialFilter?: VoucherFilter;
  onClearMerchant?: () => void;
  onOpen: (voucher: Voucher) => void;
  onRedeem: (voucher: Voucher) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPortal>
        <DialogPrimitive.Content
          data-slot="voucher-page"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onCloseFocus();
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-background text-foreground outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none"
        >
          <div className="mx-auto max-w-xl px-4 pb-6">
            <AllVouchersView
              {...rest}
              onClose={onClose}
              Title={DialogPrimitive.Title}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
