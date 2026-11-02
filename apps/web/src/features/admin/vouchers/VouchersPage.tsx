import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelQuery } from '@/components/PanelQuery';
import { useMerchants } from '../merchants/useMerchants';
import { PageHeader, TwoHalves } from '../layout';
import { Select } from '../Select';
import { useDetailScroll } from '../useDetailScroll';
import { VoucherDetail } from './VoucherDetail';
import { VoucherRow } from './VoucherRow';
import { useAdminVouchers, type VoucherFilters } from './useVouchers';

// Every voucher in any state, by merchant and by whether it is retired
export function VouchersPage() {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<VoucherFilters>({
    merchantId: '',
    status: '',
  });
  const [picked, setPicked] = useState<number | null>(null);
  const { detail, reveal } = useDetailScroll();
  const merchants = useMerchants();
  const query = useAdminVouchers(filters);
  const vouchers = query.data;
  const selected = vouchers?.find((v) => v.id === picked) ?? vouchers?.[0];

  const merchantOptions = merchants.data
    ?.slice()
    .sort((a, b) => a.name.localeCompare(b.name, i18n.language));

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title={t('admin.vouchers.title')}
        subtitle={
          vouchers &&
          t(
            query.hasNextPage
              ? 'admin.vouchers.countMore'
              : 'admin.vouchers.count',
            { count: vouchers.length },
          )
        }
      />
      <div
        data-surface="ground"
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:max-w-2xl"
      >
        <div className="space-y-2">
          <label
            htmlFor="voucher-merchant"
            className="block text-sm font-medium"
          >
            {t('admin.vouchers.filter.merchant')}
          </label>
          <Select
            id="voucher-merchant"
            value={filters.merchantId}
            onChange={(event) =>
              setFilters({ ...filters, merchantId: event.target.value })
            }
          >
            <option value="">{t('admin.vouchers.filter.allMerchants')}</option>
            {merchantOptions?.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="voucher-status" className="block text-sm font-medium">
            {t('admin.vouchers.filter.status')}
          </label>
          <Select
            id="voucher-status"
            value={filters.status}
            onChange={(event) =>
              setFilters({
                ...filters,
                status: event.target.value as VoucherFilters['status'],
              })
            }
          >
            <option value="">{t('admin.vouchers.filter.allStatus')}</option>
            <option value="active">{t('admin.vouchers.filter.active')}</option>
            <option value="expired">
              {t('admin.vouchers.filter.retired')}
            </option>
          </Select>
        </div>
      </div>
      <TwoHalves>
        <PanelQuery
          title={t('admin.vouchers.list')}
          query={query}
          isEmpty={(list) => list.length === 0}
          emptyText={t('admin.vouchers.empty')}
        >
          {(list, loadedAt) => (
            <>
              <ul className="-mx-4">
                {list.map((voucher) => (
                  <VoucherRow
                    key={voucher.id}
                    voucher={voucher}
                    now={loadedAt}
                    selected={voucher.id === selected?.id}
                    onSelect={() => {
                      setPicked(voucher.id);
                      reveal();
                    }}
                  />
                ))}
              </ul>
              {query.hasNextPage && (
                <button
                  type="button"
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                  className="my-1 flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-medium underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-card-foreground disabled:opacity-60"
                >
                  {t(
                    query.isFetchingNextPage
                      ? 'admin.vouchers.loading'
                      : 'admin.vouchers.more',
                  )}
                </button>
              )}
            </>
          )}
        </PanelQuery>
        {selected && (
          <VoucherDetail
            ref={detail}
            voucher={selected}
            now={query.dataUpdatedAt}
          />
        )}
      </TwoHalves>
    </div>
  );
}
