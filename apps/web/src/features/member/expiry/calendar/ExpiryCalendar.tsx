import { useState } from 'react';
import { DaysView } from './DaysView';
import type { Base, CalendarView } from './types';
import { WindowView } from './WindowView';
import { YearView } from './YearView';
import { inHorizon, monthsAhead } from '../expiry';

// Six months; a year opens its 12 months, a month its days
export function ExpiryCalendar({
  marks,
  loadedAt,
  activeKey,
  selectedKey,
  onActiveChange,
  onPick,
}: Base & { loadedAt: number }) {
  const [view, setView] = useState<CalendarView>({ kind: 'window' });
  const [seen, setSeen] = useState(selectedKey);
  const now = new Date(loadedAt);
  // Selecting a mark jumps to its day
  if (selectedKey !== seen) {
    setSeen(selectedKey);
    const expires = marks.find((mark) => mark.key === selectedKey)?.expiresAt;
    if (expires) {
      const date = new Date(expires);
      const year = date.getFullYear();
      const month = date.getMonth();
      const here =
        view.kind === 'days' && view.year === year && view.month === month;
      if (!here && inHorizon(monthsAhead(year, month, now))) {
        setView({
          kind: 'days',
          year,
          month,
          from: view.kind === 'year' ? 'year' : 'window',
        });
      }
    }
  }
  const base = { marks, activeKey, selectedKey, onActiveChange, onPick };
  return (
    <div data-surface="ground" className="text-foreground">
      {view.kind === 'window' && (
        <WindowView base={base} now={now} open={setView} />
      )}
      {view.kind === 'year' && (
        <YearView year={view.year} base={base} now={now} open={setView} />
      )}
      {view.kind === 'days' && (
        <DaysView view={view} base={base} now={now} open={setView} />
      )}
    </div>
  );
}
