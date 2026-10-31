import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelQuery } from '@/components/PanelQuery';
import { ShowMore } from '@/components/ShowMore';
import { byExpiry } from './expiry';
import { LotRow } from './LotRow';
import { useLots } from './useLots';
import type { Lot } from './useLots';

// Lots shown before "show all"
const SHOWN = 5;

// The nearest expiry first; `loadedAt` is "today"
function Rows({ lots, loadedAt }: { lots: Lot[]; loadedAt: number }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const sorted = [...lots].sort(byExpiry);
  const shown = expanded ? sorted : sorted.slice(0, SHOWN);

  return (
    <div>
      <ul className="divide-y divide-border">
        {shown.map((lot) => (
          <li key={lot.id}>
            <LotRow lot={lot} loadedAt={loadedAt} />
          </li>
        ))}
      </ul>
      {sorted.length > SHOWN && (
        <ShowMore
          expanded={expanded}
          onToggle={() => setExpanded((value) => !value)}
          moreLabel={t('timeline.showAll', { n: sorted.length })}
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
      {(data, loadedAt) => <Rows lots={data} loadedAt={loadedAt} />}
    </PanelQuery>
  );
}
