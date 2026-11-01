import { useTranslation } from 'react-i18next';
import { FormError } from '@/components/FormError';
import type { PanelQueryState } from '@/components/PanelQuery';
import { Button } from '@/components/ui/button';
import { groupRedemptions } from './groups';
import type { RedemptionGroups } from './groups';
import { RedemptionTicket } from './RedemptionTicket';
import { useRedemptions } from './useRedemptions';
import type { MemberRedemption } from './useRedemptions';

const GROUPS: { key: keyof RedemptionGroups; label: string }[] = [
  { key: 'active', label: 'redemptions.active' },
  { key: 'past', label: 'redemptions.past' },
];

function Groups({
  items,
  loadedAt,
}: {
  items: MemberRedemption[];
  loadedAt: number;
}) {
  const { t } = useTranslation();
  const groups = groupRedemptions(items);

  return (
    <div className="space-y-5">
      {GROUPS.map(({ key, label }) => {
        const shown = groups[key];
        if (shown.length === 0) return null;
        return (
          <section key={key}>
            <h3
              data-surface="ground"
              className="mb-2 text-sm font-semibold text-muted-foreground"
            >
              {t('redemptions.groupTitle', {
                name: t(label),
                count: shown.length,
              })}
            </h3>
            <ul className="space-y-3">
              {shown.map((item) => (
                <RedemptionTicket
                  key={item.id}
                  item={item}
                  loadedAt={loadedAt}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// List on a query result
export function RedemptionListView({
  query,
}: {
  query: PanelQueryState<MemberRedemption[]>;
}) {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">{t('redemptions.title')}</h2>
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
            {t('redemptions.empty')}
          </p>
        ) : (
          <Groups items={query.data} loadedAt={query.dataUpdatedAt} />
        ))}
    </section>
  );
}

export function RedemptionList() {
  const redemptions = useRedemptions();
  return <RedemptionListView query={redemptions} />;
}
