import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelQuery } from '@/components/PanelQuery';
import { ShowMore } from '@/components/ShowMore';
import { RubberStamp } from '@/components/RubberStamp';
import { formatPoints } from '@/lib/format';
import { cutDepth } from './divider/dividerShape';
import { ExpiryCalendar } from './calendar/ExpiryCalendar';
import { ExpiryDivider } from './divider/ExpiryDivider';
import { byExpiry, daysOf, EXPIRING_SOON_DAYS, isSoon } from './expiry';
import { LotList } from './LotList';
import { marksOf } from './marks';
import { useActiveMark } from './useActiveMark';
import { useLots } from './useLots';
import type { Lot } from './useLots';
import { useRedemptions } from '../redemptions/useRedemptions';

// Lots shown after the soon group
const LATER_SHOWN = 3;

// The soon group, then the rest folded
function useRows(lots: Lot[], loadedAt: number) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...lots].sort(byExpiry);
  const soon = sorted.filter((lot) => isSoon(lot, loadedAt));
  const later = sorted.filter((lot) => !isSoon(lot, loadedAt));
  return {
    soon,
    later: expanded ? later : later.slice(0, LATER_SHOWN),
    total: lots.length,
    foldable: later.length > LATER_SHOWN,
    expanded,
    toggle: () => setExpanded((value) => !value),
  };
}

// Points expiring within the horizon
function AtRisk({ points }: { points: number }) {
  const { t, i18n } = useTranslation();
  return (
    // the basis is the number alone
    <div className="flex-[1_1_min-content] pb-1">
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="font-mono text-2xl leading-8 font-bold tabular-nums">
          {formatPoints(points, i18n.language)}
        </span>
        <span className="text-base font-semibold">
          {t('timeline.unit', { count: points })}
        </span>
      </p>
      <p className="text-sm text-balance text-muted-foreground">
        {t('timeline.expiresIn', { days: EXPIRING_SOON_DAYS })}
      </p>
    </div>
  );
}

// Points at risk and the stamp, then the rows. `loadedAt` is "today"
function Groups({
  lots,
  loadedAt,
  link,
}: {
  lots: Lot[];
  loadedAt: number;
  link: ReturnType<typeof useActiveMark>;
}) {
  const { t } = useTranslation();
  const rows = useRows(lots, loadedAt);
  const nearest = rows.soon[0] ? daysOf(rows.soon[0], loadedAt) : null;
  const atRisk = rows.soon.reduce((sum, lot) => sum + lot.remaining, 0);

  return (
    <div>
      {rows.soon.length > 0 && (
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 pt-3">
          <AtRisk points={atRisk} />
          <RubberStamp
            size="sm"
            rotate={-6}
            className="ml-auto"
            sub={t('timeline.lots', { count: rows.soon.length })}
          >
            {t('timeline.soon')}
          </RubberStamp>
        </div>
      )}
      <LotList
        lots={rows.soon}
        loadedAt={loadedAt}
        link={link}
        className="mt-2"
      />
      {nearest !== null && rows.later.length > 0 && (
        <ExpiryDivider depth={cutDepth(nearest)} />
      )}
      <LotList lots={rows.later} loadedAt={loadedAt} link={link} />
      {rows.foldable && (
        <ShowMore
          expanded={rows.expanded}
          onToggle={rows.toggle}
          moreLabel={t('timeline.showAll', { n: rows.total })}
          lessLabel={t('timeline.showLess')}
        />
      )}
    </div>
  );
}

export function ExpiryTimeline() {
  const { t } = useTranslation();
  const lots = useLots();
  const redemptions = useRedemptions();
  const link = useActiveMark();
  const [openedAt] = useState(Date.now);
  const loadedAt = lots.dataUpdatedAt || redemptions.dataUpdatedAt || openedAt;
  const marks = marksOf(lots.data ?? [], redemptions.data ?? [], loadedAt);

  return (
    <div className="space-y-6">
      <section data-surface="ground">
        <h2 className="mb-2 text-base font-semibold">
          {t('timeline.calendarTitle')}
        </h2>
        <ExpiryCalendar marks={marks} loadedAt={loadedAt} {...link.calendar} />
      </section>
      <PanelQuery
        title={t('timeline.title')}
        query={lots}
        isEmpty={(data) => data.length === 0}
        emptyText={t('timeline.empty')}
      >
        {(data, at) => <Groups lots={data} loadedAt={at} link={link} />}
      </PanelQuery>
    </div>
  );
}
