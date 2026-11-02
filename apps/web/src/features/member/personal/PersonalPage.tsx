import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sameDay } from '../expiry/expiry';
import { useActiveMark } from '../expiry/useActiveMark';
import { useLots } from '../expiry/useLots';
import { RedemptionListView } from '../redemptions/RedemptionList';
import { useRedemptions } from '../redemptions/useRedemptions';
import { useMe } from '../useMe';
import { MonthCalendar } from './calendar/MonthCalendar';
import { FavoritesSection } from './FavoritesSection';
import { HistoryTab } from './HistoryTab';
import { marksOf } from './marks';
import type { MarkKind } from './marks';
import { PersonalHeader } from './PersonalHeader';
import { panelId, PersonalTabs, tabId } from './PersonalTabs';
import { PointsTab } from './PointsTab';
import { FUTURE, PAST } from './range';
import { useHistoryYear } from './useHistoryYear';

// Calendar on the left, the three tabs on the right from xl
export function PersonalPage() {
  const { t } = useTranslation();
  const base = useId().replace(/:/g, '');
  const me = useMe();
  const lots = useLots();
  const redemptions = useRedemptions();
  const history = useHistoryYear();
  const link = useActiveMark();
  const [tab, setTab] = useState<MarkKind>('points');
  const [day, setDay] = useState<Date | null>(null);
  const [openedAt] = useState(Date.now);
  const loadedAt =
    lots.dataUpdatedAt ||
    redemptions.dataUpdatedAt ||
    history.dataUpdatedAt ||
    openedAt;
  const marks = marksOf(
    lots.data ?? [],
    redemptions.data ?? [],
    history.data?.entries ?? [],
    loadedAt,
  ).filter((mark) => mark.kind === tab);

  const select = (kind: MarkKind) => {
    if (kind === tab) return;
    link.clear();
    setDay(null);
    setTab(kind);
  };
  const toggleDay = (date: Date) =>
    setDay((current) => (current && sameDay(current, date) ? null : date));

  return (
    <section className="py-6 md:py-10 xl:grid xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] xl:grid-rows-[auto_auto_1fr] xl:gap-x-10">
      <div className="max-w-2xl xl:col-start-1 xl:row-start-1">
        <PersonalHeader />
      </div>
      <div className="max-w-2xl xl:col-start-1 xl:row-start-2">
        <h2 className="sr-only">{t('personal.calendar')}</h2>
        <MonthCalendar
          // a new range starts at its own month
          key={tab}
          marks={marks}
          range={tab === 'history' ? PAST : FUTURE}
          day={
            tab === 'history' ? { selected: day, onPick: toggleDay } : undefined
          }
          loadedAt={loadedAt}
          {...link.calendar}
        />
      </div>
      <div className="mt-3 max-w-2xl xl:col-start-2 xl:row-span-3 xl:row-start-1 xl:mt-0">
        <PersonalTabs base={base} value={tab} onChange={select} />
        <div
          role="tabpanel"
          id={panelId(base)}
          aria-labelledby={tabId(base, tab)}
          className="mt-3"
        >
          {tab === 'points' && <PointsTab lots={lots} link={link} />}
          {tab === 'code' && (
            <RedemptionListView query={redemptions} link={link} />
          )}
          {tab === 'history' && (
            <HistoryTab
              query={history}
              link={link}
              day={day}
              onClearDay={() => setDay(null)}
            />
          )}
        </div>
      </div>
      {me.data && (
        <div className="mt-6 max-w-2xl xl:col-start-1 xl:row-start-3">
          <FavoritesSection balance={me.data.balance} />
        </div>
      )}
    </section>
  );
}
