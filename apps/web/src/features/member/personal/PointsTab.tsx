import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelQuery } from '@/components/PanelQuery';
import { RubberStamp } from '@/components/RubberStamp';
import { ShowMore } from '@/components/ShowMore';
import { cutDepth } from '@/features/member/expiry/divider/dividerShape';
import { ExpiryDivider } from '@/features/member/expiry/divider/ExpiryDivider';
import {
  byExpiry,
  daysOf,
  EXPIRING_SOON_DAYS,
  isSoon,
} from '@/features/member/expiry/expiry';
import { LotList } from '@/features/member/expiry/LotList';
import type { useActiveMark } from '@/features/member/expiry/useActiveMark';
import type { useLots } from '@/features/member/expiry/useLots';
import type { Lot } from '@/features/member/expiry/useLots';
import { formatPoints } from '@/lib/format';

// Lots shown after the soon group
const LATER_SHOWN = 3;

type Link = ReturnType<typeof useActiveMark>;

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

function AtRisk({ points }: { points: number }) {
  const { t, i18n } = useTranslation();
  return (
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

function Groups({
  lots,
  loadedAt,
  link,
}: {
  lots: Lot[];
  loadedAt: number;
  link: Link;
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

export function PointsTab({
  lots,
  link,
}: {
  lots: ReturnType<typeof useLots>;
  link: Link;
}) {
  const { t } = useTranslation();
  return (
    <PanelQuery
      title={t('timeline.title')}
      query={lots}
      isEmpty={(data) => data.length === 0}
      emptyText={t('timeline.empty')}
    >
      {(data, at) => <Groups lots={data} loadedAt={at} link={link} />}
    </PanelQuery>
  );
}
