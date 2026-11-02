import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelQuery } from '@/components/PanelQuery';
import { Input } from '@/components/ui/input';
import { useMerchants } from '../merchants/useMerchants';
import { PageHeader, TwoHalves } from '../layout';
import { useTiers } from '../programme/useProgramme';
import { Select } from '../Select';
import { useDebouncedValue } from '../useDebouncedValue';
import { useDetailScroll } from '../useDetailScroll';
import { MemberDetail } from './MemberDetail';
import { MemberRow } from './MemberRow';
import { useAdminMembers } from './useAdminMembers';

// Members of every merchant: find one by name or email, narrow by merchant and tier
export function MembersPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [tierId, setTierId] = useState('');
  const q = useDebouncedValue(search.trim());
  const [picked, setPicked] = useState<number | null>(null);
  const { detail, reveal } = useDetailScroll();
  const merchants = useMerchants();
  const tiers = useTiers();
  const query = useAdminMembers({ merchantId, tierId, q });
  const members = query.data;
  const selected = members?.find((m) => m.id === picked) ?? members?.[0];

  const merchantOptions = merchants.data
    ?.slice()
    .sort((a, b) => a.name.localeCompare(b.name, i18n.language));

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title={t('admin.members.title')}
        subtitle={
          members &&
          t(
            query.hasNextPage
              ? 'admin.members.countMore'
              : 'admin.members.count',
            { count: members.length },
          )
        }
      />
      <div
        data-surface="ground"
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3"
      >
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <label htmlFor="member-search" className="block text-sm font-medium">
            {t('admin.members.filter.search')}
          </label>
          <Input
            id="member-search"
            type="search"
            autoComplete="off"
            maxLength={100}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="member-merchant"
            className="block text-sm font-medium"
          >
            {t('admin.members.filter.merchant')}
          </label>
          <Select
            id="member-merchant"
            value={merchantId}
            onChange={(event) => setMerchantId(event.target.value)}
          >
            <option value="">{t('admin.members.filter.allMerchants')}</option>
            {merchantOptions?.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="member-tier" className="block text-sm font-medium">
            {t('admin.members.filter.tier')}
          </label>
          <Select
            id="member-tier"
            value={tierId}
            onChange={(event) => setTierId(event.target.value)}
          >
            <option value="">{t('admin.members.filter.allTiers')}</option>
            {tiers.data?.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <TwoHalves>
        <PanelQuery
          title={t('admin.members.list')}
          query={query}
          isEmpty={(list) => list.length === 0}
          emptyText={t('admin.members.empty')}
        >
          {(list) => (
            <>
              <ul className="-mx-4">
                {list.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    selected={member.id === selected?.id}
                    onSelect={() => {
                      setPicked(member.id);
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
                      ? 'admin.members.loading'
                      : 'admin.members.more',
                  )}
                </button>
              )}
            </>
          )}
        </PanelQuery>
        {selected && (
          <MemberDetail key={selected.id} ref={detail} member={selected} />
        )}
      </TwoHalves>
    </div>
  );
}
