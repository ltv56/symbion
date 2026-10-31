import { cn } from 'cn';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelQuery } from '@/components/PanelQuery';
import { ShowMore } from '@/components/ShowMore';
import { RubberStamp } from '@/components/RubberStamp';
import { formatPoints } from '@/lib/format';
import { byExpiry, EXPIRING_SOON_DAYS, isSoon } from './expiry';
import { LotRow } from './LotRow';
import { useLots } from './useLots';
import type { Lot } from './useLots';

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

function RowList({
  lots,
  loadedAt,
  className,
}: {
  lots: Lot[];
  loadedAt: number;
  className?: string;
}) {
  return (
    <ul className={cn('divide-y divide-border', className)}>
      {lots.map((lot) => (
        <li key={lot.id}>
          <LotRow lot={lot} loadedAt={loadedAt} />
        </li>
      ))}
    </ul>
  );
}

// Points at risk and the stamp, then the rows. `loadedAt` is "today"
function Groups({ lots, loadedAt }: { lots: Lot[]; loadedAt: number }) {
  const { t } = useTranslation();
  const rows = useRows(lots, loadedAt);
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
      <RowList lots={rows.soon} loadedAt={loadedAt} className="mt-2" />
      <RowList lots={rows.later} loadedAt={loadedAt} />
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

  return (
    <PanelQuery
      title={t('timeline.title')}
      query={lots}
      isEmpty={(data) => data.length === 0}
      emptyText={t('timeline.empty')}
    >
      {(data, loadedAt) => <Groups lots={data} loadedAt={loadedAt} />}
    </PanelQuery>
  );
}
